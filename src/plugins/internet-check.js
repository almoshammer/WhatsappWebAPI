const url = require('url');
const Promise = require('bluebird');
const net = require('net');

Promise.config({
  cancellation: true
});

async function checkInternetConnected(config = {}) {
  const { timeout = 2500, retries = 2, domain = 'google.com' } = config;
  
  for (let i = 0; i < retries; i++) {
    const connectPromise = new Promise(function (resolve, reject, onCancel) {
      const client = new net.Socket();
      client.connect({ port: 80, host: 'google.com' }, () => {
        resolve(true);
        client.destroy();
      });
      client.on('data', (data) => { });
      client.on('error', (err) => { client.destroy(); reject(err); });
      client.on('close', () => { });
      onCancel(() => { client.destroy(); });
    });
    try {
      return await connectPromise.timeout(timeout);
    } catch (ex) {
      if (i === (retries - 1)) {
        throw ex;
      }
    }
  }
}

module.exports = checkInternetConnected;