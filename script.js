import { addCacheItem, getCachedItem, isCached } from "./locationCaching.js";

const API_KEY = "481a7c4ab04bc830b729294a0471613e";

// NAME OF CITY
let selectedCityText;
// CITY OBJECT CONTAINER LATITUDE AND LONGITUDE
let selectedCity;
let backgroundImageUrl = "";

// GET CURRENT WEATHER OF CITY BY LATITUDE AND LONGITUDE
const getCurrentWeatherData = async ({ lat, lon, name: city }) => {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
  const response = await fetch(url);
  return response.json();
};

// GET HOURLY WEATHER OF CITY
const getHourlyForecast = async ({ coord: { lon, lat } }) => {
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
  const response = await fetch(url);
  const data = await response.json();
  return data.list.map((forecast) => {
    const {
      main: { temp, temp_max, temp_min },
      dt,
      dt_txt,
      weather: [{ description, icon }],
      list,
    } = forecast;
    return { temp, temp_max, temp_min, dt, dt_txt, description, icon };
  });
};

// GET FIVE DAY FORECAST BY MAPPING AND COMBINING ENTRIES FROM HOURLY FORECAST OF CITY
const getFiveDayForecast = async (hourlyForecast) => {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const result = new Map();

  // LOOP THROUGH EACH 3 HOUR FORECAST AND CHECK FOR MAX TEMP AND MIN TEMP
  // AND ALSO TAKE THE FIRST ICON YOU GET
  for (const { temp_min, temp_max, dt_txt, icon } of hourlyForecast) {
    let currentDate = dt_txt.split(" ")[0];
    if (result.get(currentDate)) {
      const tempForecast = result.get(currentDate);
      tempForecast.temp_max =
        tempForecast.temp_max > temp_max ? tempForecast.temp_max : temp_max;
      tempForecast.temp_min =
        tempForecast.temp_min < temp_min ? tempForecast.temp_min : temp_min;
      result.set(currentDate, tempForecast);
    } else {
      result.set(currentDate, {
        temp_max,
        temp_min,
        icon,
        day: days[new Date(currentDate).getDay()],
      });
    }
  }
  return Array.from(result.values());
};

// GET CITY SUGGESTION NAME BY THE TEXT GIVEN
const getCitiesUsingGeolocation = async function (searchText) {
  const url = `https://api.openweathermap.org/geo/1.0/direct?q=${searchText}&limit=5&appid=${API_KEY}`;
  const response = await fetch(url);
  return response.json();
};

// FORMAT TEMPERATURE TO 1 DECIMAL
const formatTemperature = (temp) => `${temp?.toFixed(1)}°`;

// CREATE ICON URL
const createIconUrl = (icon) =>
  `http://openweathermap.org/img/wn/${icon}@2x.png`;

// USE CURRENT LOCATION OF DEVICE AND SHOW WEATHER DATA ELSE SHOW ERROR
const loadForecastUsingGeolocation = () => {
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      const { latitude: lat, longitude: lon } = coords;
      selectedCity = { lat, lon };
      loadData();
    },
    (error) => {
      console.log(error);
      setTimeout(() => {
        document.getElementById("location-denied").classList.remove("hidden");
      }, 200);
    }
  );
};

const loadCurrentForecast = ({
  name,
  main: { temp, temp_max, temp_min },
  weather: [{ description, icon }],
}) => {
  const currentForecastElement = document.querySelector("#current-forecast");
  currentForecastElement.querySelector(".city").textContent = name;
  currentForecastElement.querySelector(".temp").textContent =
    formatTemperature(temp);
  currentForecastElement.querySelector(
    ".min-max-temp"
  ).textContent = `H: ${formatTemperature(temp_max)} L: ${formatTemperature(
    temp_min
  )}`;
  currentForecastElement
    .querySelector(".icon")
    .setAttribute("src", createIconUrl(icon));

  currentForecastElement.querySelector(".description").textContent =
    description;

  const tempImageTag = new Image();
  onImageLoadListener(tempImageTag);
  backgroundImageUrl = `./appImages/${icon}.jpg`;
  tempImageTag.src = backgroundImageUrl;
  document.getElementById("location-denied").classList.add("hidden");

  // document.querySelector(
  //   "#background"
  // ).style.backgroundImage = `url(${backgroundImageUrl})`;
};

const loadHourlyForecast = (hourlyForecast) => {
  // console.log(hourlyForecast);
  const timeFormatter = Intl.DateTimeFormat("en", {
    hour12: true,
    hour: "numeric",
  });
  let dataFor12Hours = hourlyForecast.slice(2, 14);
  const hourlyContainer = document.querySelector(".hourly-container");
  let innerHTMLString = ``;
  for (let { temp, icon, dt_txt } of dataFor12Hours) {
    innerHTMLString += `<article>
        <h3 class="time">${timeFormatter.format(new Date(dt_txt))}</h3>
        <img class="icon" src="${createIconUrl(icon)}">
        <p class="hourly-temp">${formatTemperature(temp)}</p>
      </article>`;
  }
  hourlyContainer.innerHTML = innerHTMLString;
};

const loadFiveDayForecast = (fiveDayForecast) => {
  // console.log(fiveDayForecast);
  const fiveDayContainer = document.querySelector(".five-day-container");
  let innerHTMLString = ``;
  for (let { temp_min, temp_max, day, icon } of fiveDayForecast.slice(0, -1)) {
    innerHTMLString += `<article class="day-wise-forecast">
        <h3>${day}</h3>
        <img class="icon" src="${createIconUrl(icon)}">
        <p class="temp-low">${formatTemperature(temp_min)}</p>
        <p class="temp-high">${formatTemperature(temp_max)}</p>
      </article>`;
  }
  fiveDayContainer.innerHTML = innerHTMLString;
};

const loadFeelsLikeAndHumidity = ({ main: { feels_like, humidity } }) => {
  const feelsLikeTempElement = document.querySelector(".feels-like-temp");
  const humidityValueElement = document.querySelector(".humidity-value");
  feelsLikeTempElement.textContent = formatTemperature(feels_like);
  humidityValueElement.textContent = humidity;
};

function debounce(func) {
  let timer;
  return (...args) => {
    clearTimeout(timer); // clear existing timer
    timer = setTimeout(() => {
      func.apply(this, args);
    }, 500);
  };
}

const onSearchChange = async (event) => {
  let { value } = event.target;

  if (!value) {
    selectedCity = null;
    selectedCityText = "";
    document.querySelector(".focus-border").style.backgroundColor = "white";
  }
  await showCityList(value);
};

const showCityList = async (value) => {
  if (value && selectedCityText != value) {
    const listOfCities = await getCitiesUsingGeolocation(value);
    let options = ``;

    if (!listOfCities.length) {
      document.querySelector(".focus-border").style.backgroundColor =
        "var(--color-error)";
    } else {
      document.querySelector(".focus-border").style.backgroundColor = "white";
      for (let { name, state, country, lat, lon } of listOfCities) {
        const optionValue = `${name}, ${state ? state + ", " : ""}${country}`;
        options += `
        <option data-city-details='${JSON.stringify({
          lat,
          lon,
          name,
        })}' value="${optionValue}">
        `;
      }
    }

    document.querySelector("#cities").innerHTML = options;
  }
};

const debouncedSearch = debounce((event) => onSearchChange(event));

const handleCitySelection = async (event) => {
  selectedCityText = event.target.value;
  let options = document.querySelectorAll("#cities > option");
  if (selectedCityText && options.length) {
    let selectedOption = Array.from(options).find(
      (opt) => opt.value === selectedCityText
    );
    if (selectedOption) {
      selectedCity = JSON.parse(
        selectedOption.getAttribute("data-city-details")
      );
      document.querySelector("#search").blur();
      loadData();
    } else {
      document.querySelector(".focus-border").style.backgroundColor =
        "var(--color-error)";
    }
  }
};

const loadData = async () => {
  let { currentWeather, hourlyForecast, fiveDayForecast } = {};
  const cachedWeatherData = await getCachedItem(
    `${selectedCity.lat}-${selectedCity.lon}`
  );
  if (cachedWeatherData) {
    ({ currentWeather, hourlyForecast, fiveDayForecast } = cachedWeatherData);
  } else {
    currentWeather = await getCurrentWeatherData(selectedCity);
    // console.log(currentWeather);
    hourlyForecast = await getHourlyForecast(currentWeather);
    fiveDayForecast = await getFiveDayForecast(hourlyForecast);
    addCacheItem(`${selectedCity.lat}-${selectedCity.lon}`, {
      currentWeather,
      hourlyForecast,
      fiveDayForecast,
    });
  }
  loadCurrentForecast(currentWeather);
  loadHourlyForecast(hourlyForecast);
  loadFiveDayForecast(fiveDayForecast);
  loadFeelsLikeAndHumidity(currentWeather);
};

document.addEventListener("DOMContentLoaded", async () => {
  loadForecastUsingGeolocation();
  const searchInput = document.querySelector("#search");
  searchInput.addEventListener("input", debouncedSearch);
  searchInput.addEventListener("change", handleCitySelection);
  setInterval(() => {
    localStorage.clear();
  }, 300000);
});

// image load event listner
function onImageLoadListener(img) {
  img.onload = function (e) {
    const rgb = getAverageRGB(img);
    let rgbText = "rgb(" + rgb.r + "," + rgb.g + "," + rgb.b + ")";
    const darkRgbText = `rgb(${rgb.r - 20},${rgb.g - 20}, ${rgb.b - 20})`;
    document.body.style.background = `${rgbText}`;
    document.querySelector(".header").style.backgroundColor = darkRgbText;
    document.querySelector(
      ".container"
    ).style.backgroundImage = `url(${backgroundImageUrl})`;

    // document.querySelector("#rgb").innerText = rgbText;
  };
}

// majority image color
function getAverageRGB(imgEl) {
  var blockSize = 5, // only visit every 5 pixels
    defaultRGB = {
      r: 162,
      g: 129,
      b: 250,
    }, // for non-supporting envs
    canvas = document.createElement("canvas"),
    context = canvas.getContext && canvas.getContext("2d"),
    data,
    width,
    height,
    i = -4,
    length,
    rgb = {
      r: 0,
      g: 0,
      b: 0,
    },
    count = 0;

  if (!context) {
    return defaultRGB;
  }
  height = canvas.height =
    imgEl.naturalHeight || imgEl.offsetHeight || imgEl.height;
  width = canvas.width = imgEl.naturalWidth || imgEl.offsetWidth || imgEl.width;
  context.drawImage(imgEl, 0, 0);

  try {
    data = context.getImageData(0, 0, width, height);
  } catch (e) {
    /* security error, img on diff domain */
    alert("x");
    return defaultRGB;
  }
  length = data.data.length;
  while ((i += blockSize * 4) < length) {
    ++count;
    rgb.r += data.data[i];
    rgb.g += data.data[i + 1];
    rgb.b += data.data[i + 2];
  }
  // ~~ used to floor values
  rgb.r = ~~(rgb.r / count);
  rgb.g = ~~(rgb.g / count);
  rgb.b = ~~(rgb.b / count);
  // console.log(rgb);
  return rgb;
}
