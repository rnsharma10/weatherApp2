/* 
cache 
  - store weather info city wise in 1 object - 
    this could be stored as 
    "lan-long":
      {
        current forecast
        hourly forecast
        five day forcast
        validity: 2 hours
      }

    clear cache on load if it's out of time


 */
const lc = localStorage;
const DEFAULT_VALIDITY = 720000;

const addCacheItem = (key, value) => {
  lc.setItem(key, JSON.stringify({ value, validity: new Date() }));
};

const getCachedItem = (key) => {
  let cachedItem = lc.getItem(key);
  if (cachedItem) {
    cachedItem = JSON.parse(cachedItem);
    const itemValidity = new Date(cachedItem.validity);
    if (new Date().getTime() - itemValidity.getTime() < DEFAULT_VALIDITY) {
      return cachedItem.value;
    }
    lc.removeItem(key);
  }
  return null;
};

const isCached = (key) => {
  return lc.getItem(key) ? true : false;
};

export { addCacheItem, getCachedItem, isCached };
