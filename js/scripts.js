//Reusable Fields
const getSellFields = function () {
  let fields = []
  for (var i = 2; i < 14; i++) {
    fields.push($("#sell_" + i)[0])
  }
  return fields
}

const getFirstBuyRadios = function () {
  return [
    $("#first-time-radio-no")[0],
    $("#first-time-radio-yes")[0]
  ];
}

const getPreviousPatternRadios = function () {
  return [
    $("#pattern-radio-unknown")[0],
    $("#pattern-radio-fluctuating")[0],
    $("#pattern-radio-small-spike")[0],
    $("#pattern-radio-large-spike")[0],
    $("#pattern-radio-decreasing")[0]
  ];
}

const getCheckedRadio = function (radio_array) {
  return radio_array.find(radio => radio.checked === true).value;
}

const checkRadioByValue = function (radio_array, value) {
  if (!isNumber(value) && value === null) {
    return;
  }
  value = value.toString();
  radio_array.find(radio => radio.value == value).checked = true;
}

const sell_inputs = getSellFields()
const buy_input = $("#buy")
const first_buy_radios = getFirstBuyRadios()
const previous_pattern_radios = getPreviousPatternRadios()

//Functions
const fillFields = function (prices, first_buy, previous_pattern) {
  checkRadioByValue(first_buy_radios, first_buy);
  checkRadioByValue(previous_pattern_radios, previous_pattern);

  buy_input.focus();
  buy_input.val(prices[0] || '')
  buy_input.blur();
  const sell_prices = prices.slice(2)

  sell_prices.forEach((price, index) => {
    if (!price) {
      return
    } else {
      const element = $("#sell_" + (index + 2));
      element.focus();
      element.val(price);
      element.blur();
    }
  })
}

const initialize = function () {
  try {
    const params = new URLSearchParams(window.location.search.substr(1));
    const first_buy_state = params.get("first_buy");
    const qs_pattern = params.get("pattern");
    const sell_prices = params.get("prices").split(".").map((x) => parseInt(x, 10));

    let prices, first_buy, previous_pattern;

    if (first_buy_state || qs_pattern || Array.isArray(sell_prices)) {
      // Use the querystring loading to overwrite localstorage
      first_buy = getFirstBuyFromQuery(first_buy_state);
      previous_pattern = getPreviousPatternFromQuery(qs_pattern);
      prices = getPricesFromQuery(sell_prices);

      window.has_query = true;
    } else {
      first_buy = getFirstBuyFromLocalstorage();
      previous_pattern = getPreviousPatternFromLocalstorage();
      prices = getPricesFromLocalstorage();
    }

    if (prices === null) {
      fillFields([], first_buy, previous_pattern)
    } else {
      fillFields(prices, first_buy, previous_pattern)
    }
    $(document).trigger("input");
  } catch (e) {
    console.error(e);
  }

  $("#reset").on("click", function () {
    sell_inputs.forEach(input => input.value = '')
    fillFields([], false, -1)
    update()
  })
}

const updateLocalStorage = function (prices, first_buy, previous_pattern) {
  try {
    if (prices.length !== 14) throw "The data array needs exactly 14 elements to be valid"
    localStorage.setItem("sell_prices", JSON.stringify(prices))
    localStorage.setItem("first_buy", JSON.stringify(first_buy));
    localStorage.setItem("previous_pattern", JSON.stringify(previous_pattern));
  } catch (e) {
    console.error(e)
  }
}

const isEmpty = function (arr) {
  const filtered = arr.filter(value => value !== null && value !== '' && !isNaN(value))
  return filtered.length == 0
}

const getFirstBuyFromLocalstorage = function () {
  return JSON.parse(localStorage.getItem('first_buy'));
}

const getFirstBuyFromQuery = function (first_buy_state) {
  try {
    if (!(first_buy_state) || first_buy_state === 'no')
      return false;

    return true;
  } catch (e) {
    return null;
  }
}

const getPreviousPatternFromLocalstorage = function () {
  return JSON.parse(localStorage.getItem('previous_pattern'));
}

const getPreviousPatternFromQuery = function (qs_pattern) {
  try {
    let pattern_result = null;

    if (isNumber(qs_pattern)) {
      // its a number which aligns with the localstorage
      if ((Number(qs_pattern) >= -1) && (Number(qs_pattern) <= 3))
        pattern_result = Number(qs_pattern);
      else 
        return -1;
    } else {
      // string or something else, helps make the querystring readable
      switch(qs_pattern) {
        case 'fluctuating':
          pattern_result = 0;
          break;
        case 'small':
        case 'smallspike':
          pattern_result = 3;
          break;
        case 'large':
        case 'largespike':
          pattern_result = 1;
          break;
        case 'decreasing':
          pattern_result = 2;
          break;
        case 'none':
        case 'dontknow':
        case 'idontknow':
        default:
          pattern_result = -1;
          break;
      }
    }

    return pattern_result;
  } catch (e) {
    return null;
  }
}

const getPricesFromLocalstorage = function () {
  try {
    const sell_prices = JSON.parse(localStorage.getItem("sell_prices"));

    if (!Array.isArray(sell_prices) || sell_prices.length !== 14) {
      return null;
    }

    return sell_prices;
  } catch (e) {
    return null;
  }
}

const getPricesFromQuery = function (sell_prices) {
  try {
    const params = new URLSearchParams(window.location.search.substr(1));

    if (!Array.isArray(sell_prices)) {
      return null;
    }

    // Parse the array which is formatted like: [price, M-AM, M-PM, T-AM, T-PM, W-AM, W-PM, Th-AM, Th-PM, F-AM, F-PM, S-AM, S-PM, Su-AM, Su-PM]
    // due to the format of local storage we need to double up the price at the start of the array.
    sell_prices.unshift(sell_prices[0]);

    // This allows us to fill out the missing fields at the end of the array
    for (let i = sell_prices.length; i < 14; i++) {
      sell_prices.push(0);
    }

    return sell_prices;
  } catch (e) {
    return null;
  }
}

const getSellPrices = function () {
  //Checks all sell inputs and returns an array with their values
  return res = sell_inputs.map(function (input) {
    return parseInt(input.value || '');
  })
}

const calculateOutput = function (data, first_buy, previous_pattern) {
  if (isEmpty(data)) {
    $("#output").html("");
    return;
  }
  let output_possibilities = "";
  for (let poss of analyze_possibilities(data, first_buy, previous_pattern)) {
    var out_line = "<tr><td class='table-pattern'>" + poss.pattern_description + "</td>"
    out_line += `<td>${Number.isFinite(poss.probability) ? ((poss.probability * 100).toPrecision(3) + '%') : '—'}</td>`;
    for (let day of poss.prices.slice(1)) {
      if (day.min !== day.max) {
        out_line += `<td>${day.min} to ${day.max}</td>`;
      } else {
        out_line += `<td>${day.min}</td>`;
      }
    }
    out_line += `<td>${poss.weekGuaranteedMinimum}</td><td>${poss.weekMax}</td></tr>`;
    output_possibilities += out_line
  }

  $("#output").html(output_possibilities)
}

const update = function () {
  const sell_prices = getSellPrices();
  const buy_price = parseInt(buy_input.val());
  const first_buy = getCheckedRadio(first_buy_radios) == 'true';
  const previous_pattern = parseInt(getCheckedRadio(previous_pattern_radios));

  buy_input[0].disabled = first_buy;
  buy_input[0].placeholder = first_buy ? '—' : '...'

  const prices = [buy_price, buy_price, ...sell_prices];

  if (!window.has_query) {
    updateLocalStorage(prices, first_buy, previous_pattern);
  }

  calculateOutput(prices, first_buy, previous_pattern);
}

const isNumber = function(v) {
  const value = parseFloat(v);

  if ((typeof value === 'undefined') || (typeof value !== 'number') || (value !== Number(value)) || (Number.isFinite(value) === false))
    return false;

  return true;
}

$(document).ready(initialize);
$(document).on("input", update);
$('input[type = radio]').on("change", update);
