const API_KEY = "481a7c4ab04bc830b729294a0471613e";

const getCurrentWeatherData = async () => {
  const city = "Pune";
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`;
  const response = await fetch(url);
  return response.json();
};

const getHourlyForecast = async ({ name: city }) => {
  const url = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}&units=metric`;
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
        day: days[new Date(currentDate).getDay()],
      });
    }
  }
  console.log(result);
  return Array.from(result.values());
};

const formatTemperature = (temp) => `${temp?.toFixed(1)}°`;
const createIconUrl = (icon) =>
  `http://openweathermap.org/img/wn/${icon}@2x.png`;

const loadCurrentForecast = ({
  name,
  main: { temp, temp_max, temp_min },
  weather: [{ description }],
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

  currentForecastElement.querySelector(".description").textContent =
    description;
};

const loadHourlyForecast = (hourlyForecast) => {
  console.log(hourlyForecast);
  let dataFor12Hours = hourlyForecast.slice(1, 13);
  const hourlyContainer = document.querySelector(".hourly-container");
  let innerHTMLString = ``;
  for (let { temp, icon, dt_txt } of dataFor12Hours) {
    innerHTMLString += `<article>
        <h3 class="time">${dt_txt.split(" ")[1].substring(0, 5)}</h3>
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
  for (let { temp_min, temp_max, day } of fiveDayForecast) {
    innerHTMLString += `<article>
        <h3>${day}</h3>
        <img class="icon">icon
        <p class="temp-low">L: ${formatTemperature(temp_min)}</p>
        <p class="temp-high">H: ${formatTemperature(temp_max)}</p>
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

document.addEventListener("DOMContentLoaded", async () => {
  const currentWeather = await getCurrentWeatherData();
  const hourlyForecast = await getHourlyForecast(currentWeather);
  const fiveDayForecast = await getFiveDayForecast(hourlyForecast);
  loadCurrentForecast(currentWeather);
  loadHourlyForecast(hourlyForecast);
  loadFiveDayForecast(fiveDayForecast);
  loadFeelsLikeAndHumidity(currentWeather);
});
