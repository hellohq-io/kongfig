require('isomorphic-fetch');

var sleep = require('sleep');

let headers = {};

const addHeader = (name, value) => { headers[name] = value };
const clearHeaders = () => { headers = {} };

const get = (uri) => {
    const options = {
        method: 'GET',
        headers: {
            'Connection': 'keep-alive',
            'Accept': 'application/json'
        }
    };

    return request(uri, options);
};

const request = (uri, opts) => {
    const requestHeaders = Object.assign(
        {},
        opts.headers,
        headers
    );

    const options = Object.assign(
        {},
        opts,
        { headers: requestHeaders }
    );

    return fetchWithRetry(uri, options);
};

var requestCounter = 0;
// var cache = [];

function fetchWithRetry(url, options) {

//   const cachedResponse = cache.find(c => c.url == url);
//   if(cachedResponse)
//   {
//     return new Promise(function(resolve, reject) {
//         resolve(cachedResponse.response);
//     });
//   }

  var retries = 10;
  var retryDelay = 500;

  if (options && options.retries) {
    retries = options.retries;
  }

  if (options && options.retryDelay) {
    retryDelay = options.retryDelay;
  }

  if(requestCounter % 10 == 0) {
      sleep.msleep(2000);
  }

  return new Promise(function(resolve, reject) {
    var wrappedFetch = (n) => {

      requestCounter++;
      console.log(requestCounter + "(" + n + "): " + url);

      fetch(url, options)
        .then(response => {
          if(!response.ok)
          {
            if(n <= retries) {
                setTimeout(() => {
                    wrappedFetch(n + 1);
                }, retryDelay * Math.pow(2, n));
            } else {
                reject(error);
            }
          } else {
            //   if(!cache.some(c => c.url == url))
            //     cache.push({ url: url, response: response });
            resolve(response);
          }
        })
        .catch(error => {
          if (n <= retries) {
            setTimeout(() => {
              wrappedFetch(n + 1);
            }, retryDelay * Math.pow(2, n));
          } else {
            reject(error);
          }
        });
    };
    wrappedFetch(0);
  });
}

export default {
    addHeader,
    clearHeaders,
    get,
    request
};
