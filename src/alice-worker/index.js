import fs from 'fs';
import path from 'path';

import { initialize, errorAndExit, log } from '../workerTemplate.js';
const workerQueue = process.env.WORKERQUEUE || 'alice-worker';
const resultQueue = process.env.RESULTSQUEUE || 'results';
const rabbitHost = process.env.RABBITHOST || 'localhost';
const rabbitUser = process.env.RABBITUSER || 'rabbit';
const rabbitPass = process.env.RABBITPASS || 'rabbit';

// EXAMPLE
// {
//   "job": [
//       {
//           "id": 1,
//           "type": "alice-worker",
//           "inputs": [
//             "dummy-input"
//           ]
//         }
//   ]
// }


/**
 * TODO
 * @param {Object} workerJob The job object
 * @param {Array} inputs The inputs for this process
 */
const aliceWorker = async(workerJob, inputs) => {

  console.log('bob-worker');
  console.log('inputs', inputs);

  await new Promise((resolve, reject) => {
    resolve();
  }).catch(errorAndExit);

  workerJob.status = 'success';
  workerJob.outputs = ['alice-output'];
};

// Initialize and start the worker process
initialize(rabbitHost, rabbitUser, rabbitPass, workerQueue, resultQueue, aliceWorker);
