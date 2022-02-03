import fs from 'fs';
import path from 'path';

import { initialize, errorAndExit, log } from '../workerTemplate.js';
const workerQueue = process.env.WORKERQUEUE || 'bob-worker';
const resultQueue = process.env.RESULTSQUEUE || 'results';
const rabbitHost = process.env.RABBITHOST || 'localhost';
const rabbitUser = process.env.RABBITUSER || 'rabbit';
const rabbitPass = process.env.RABBITPASS || 'rabbit';

// EXAMPLE
// {
//   "job": [
//       {
//       "id": 2,
//       "type": "bob-worker",
//       "inputs": [
//         "fake input"
//       ]
//     }
//   ]
// }

// EXAMPLE COMBINED
// {
//   "job": [
//       {
//           "id": 1,
//           "type": "alice-worker",
//           "inputs": [
//             "dummy-input"
//           ]
//       },
//     {
//       "id": 2,
//       "type": "bob-worker",
//       "inputs": [
//         {
//           "outputOfId": 1,
//           "outputIndex": 0
//         }
//       ]
//     }
//   ]
// }

/**
 * TODO
 * @param {Object} workerJob The job object
 * @param {Array} inputs The inputs for this process
 */
const bobWorker = async(workerJob, inputs) => {

  console.log('bob-worker');
  console.log('inputs', inputs);

  await new Promise((resolve, reject) => {
    resolve();
  }).catch(errorAndExit);

  workerJob.status = 'success';
  workerJob.outputs = ['bob-output'];
};

// Initialize and start the worker process
initialize(rabbitHost, rabbitUser, rabbitPass, workerQueue, resultQueue, bobWorker);
