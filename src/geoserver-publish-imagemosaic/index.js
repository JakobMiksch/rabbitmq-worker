import { GeoServerRestClient } from 'geoserver-node-client';
import { log, initialize } from '../workerTemplate.js';
import fsPromises from 'fs/promises';
import path from 'path';

const url = process.env.GEOSERVER_REST_URL;
const user = process.env.GEOSERVER_USER;
const pw = process.env.GEOSERVER_PASSWORD;
const workerQueue = process.env.WORKERQUEUE;
const resultQueue = process.env.RESULTSQUEUE;
const rabbitHost = process.env.RABBITHOST;
const rabbitUser = process.env.RABBITUSER;
const rabbitPass = process.env.RABBITPASS;

const grc = new GeoServerRestClient(url, user, pw);

/**
 * Reads a GeoTiff from the filesystem and publishes it to a coverage store.
 *
 * @param {Object} workerJob The job object
 * @param {Array} inputs The inputs for this process
 *   First input is the workspace to publish to
 *   Second input is the name of the existing coverage store
 *   Third input is the local path where the GeoTIFF is located
 *   Fourth input defines wheter existing granule should be replaced. False by default.
 * @example
    {
       "id": 123,
       "type": "geoserver-publish-imagemosaic",
       "inputs": [
           "klips",
           "my-coverageStore",
           "/path/to/the/GeoTiff.tif",
           "true"
        ]
    }
 */
const geoserverPublishImageMosaic = async (workerJob, inputs) => {
  const ws = inputs[0];
  const covStore = inputs[1];
  const layerName = inputs[1];
  const coverageToAdd = inputs[2];
  const replaceExistingGranule = inputs[3] ? inputs[3] : false;

  let newPath;

  const geoServerAvailable = await isGeoServerAvailable();

  if (!geoServerAvailable) {
    console.log('Geoserver not available');
    console.log('Job should be requeued!');
    workerJob.missingPreconditions = true;
    return;
  }

  try {
    // Check if coverage store exists
    const covStoreObject = await grc.datastores.getCoverageStore(ws, covStore);

    if (!covStoreObject) {
      throw `Coverage store ${covStore} does not exist.`;
    }

    // Move coverage to coverage store folder to keep file structure clean in data directory
    const fileName = path.basename(coverageToAdd);
    const dirName = path.dirname(coverageToAdd);
    // The internal geoserver url always starts with 'file:', so we split it and use the second index
    const coverageStorePath = covStoreObject.coverageStore.url.split(":")[1];

    newPath = `${dirName}/${coverageStorePath}/${fileName}`;
    // Move GeoTiff
    await fsPromises.rename(coverageToAdd, newPath);

    // Check if granule already exists
    const granules = await grc.imagemosaics.getGranules(ws, covStore, covStore);
    const granuleAlreadyExists = granules.features.some(
      feature => feature.properties.location === newPath
    );

    if (granuleAlreadyExists && !replaceExistingGranule) {
      throw 'Granule with this timestamp already exists.';
    }

    await grc.imagemosaics.addGranuleByServerFile(
      ws, covStore, newPath
    );
    log('Successfully added new granule to coverage store.');

    // check if layer has time dimension enabled
    let hasTime = false;
    const coverage = await grc.layers.getCoverage(ws, covStore, covStore);
    if (coverage && coverage.coverage.metadata && coverage.coverage.metadata.entry &&
      coverage.coverage.metadata.entry['@key'] === 'time' && (typeof coverage.coverage.metadata.entry.dimensionInfo === 'object')) {
      const dimInfo = coverage.coverage.metadata.entry.dimensionInfo;
      if (dimInfo.enabled === true && dimInfo.acceptableInterval) {
        hasTime = true;
      }
    }

    if (!hasTime) {
      log(`Enabling time for layer "${ws}:${layerName}"`);
      await grc.layers.enableTimeCoverage(ws, covStore, covStore, 'LIST', 3600000, 'MAXIMUM', true, false, 'PT30M');
      log(`Time dimension  for layer "${ws}:${covStore}" successfully enabled.`);
    }

  } catch (error) {
    log(error);
    throw 'Could not add new granule to coverage store.';
  }

  workerJob.status = 'success';
  workerJob.outputs = [newPath];
};

/**
 * Check if the GeoServer is running.
 *
 * @returns {Boolean} If the GeoServer is running.
 */
const isGeoServerAvailable = async () => {
  return await grc.about.exists();
}

// Initialize and start the worker process
initialize(rabbitHost, rabbitUser, rabbitPass, workerQueue, resultQueue, geoserverPublishImageMosaic);
