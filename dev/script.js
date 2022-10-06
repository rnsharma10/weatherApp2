const API_KEY = "481a7c4ab04bc830b729294a0471613e";

let selectedCityText;
let selectedCity;

const getCurrentWeatherData = async ({ lat, lon, name: city }) => {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
  const response = await fetch(url);
  return response.json();
};

const getHourlyForecast = async ({ name: city }) => {
  const url = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&limit=5&appid=${API_KEY}&units=metric`;
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

const getFiveDayForecast = async (hourlyForecast) => {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const result = new Map();
  for (const { temp_min, temp_max, dt_txt, icon } of hourlyForecast) {
    console.log("run");
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
  console.log(result);
  return Array.from(result.values());
};

const getCitiesUsingGeolocation = async function (searchText) {
  const url = `https://api.openweathermap.org/geo/1.0/direct?q=${searchText}&limit=5&appid=${API_KEY}`;
  const response = await fetch(url);
  return response.json();
};

const formatTemperature = (temp) => `${temp?.toFixed(1)}°`;
const createIconUrl = (icon) =>
  `http://openweathermap.org/img/wn/${icon}@2x.png`;

const loadForecastUsingGeolocation = () => {
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      console.log(coords);
      const { latitude: lat, longitude: lon } = coords;
      selectedCity = { lat, lon };
      loadData();
    },
    (error) => console.log(error)
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
};

const loadHourlyForecast = (hourlyForecast) => {
  console.log(hourlyForecast);
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
  console.log(fiveDayForecast);
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
    console.log(`timer ${timer}`);
    clearTimeout(timer); // clear existing timer
    timer = setTimeout(() => {
      console.log(`timer ${timer}`);

      console.log(`args ${JSON.stringify(args)}`);
      func.apply(this, args);
    }, 500);
  };
}

const onSearchChange = async (event) => {
  console.log(`event ${JSON.stringify(event)}`);
  let { value } = event.target;

  if (!value) {
    selectedCity = null;
    selectedCityText = "";
  }

  if (value && selectedCityText != value) {
    const listOfCities = await getCitiesUsingGeolocation(value);
    let options = ``;
    for (let { name, state, country, lat, lon } of listOfCities) {
      options += `
      <option data-city-details='${JSON.stringify({
        lat,
        lon,
        name,
      })}' value="${name}, ${state}, ${country}">
      `;
    }

    document.querySelector("#cities").innerHTML = options;
  }
};

const debouncedSearch = debounce((event) => onSearchChange(event));

const handleCitySelection = (event) => {
  selectedCityText = event.target.value;

  let options = document.querySelectorAll("#cities > option");
  if (options?.length) {
    let selectedOption = Array.from(options).find(
      (opt) => opt.value === selectedCityText
    );
    selectedCity = JSON.parse(selectedOption.getAttribute("data-city-details"));
    loadData();
  }
};

const loadData = async () => {
  const currentWeather = await getCurrentWeatherData(selectedCity);
  const hourlyForecast = await getHourlyForecast(currentWeather);
  const fiveDayForecast = await getFiveDayForecast(hourlyForecast);
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
});
