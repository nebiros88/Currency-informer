'use strict'
let online = window.navigator.onLine; // checking internet connection true/false
let currencies = {};
if (!online) {
    alert("Отсутсвует подключение к интернету! Отображены последние, ранее сохраненные курсы.");
}

const webWorker = new Worker('workers/webWorker.js');
const currentRatesUrl = 'https://www.nbrb.by/api/exrates/rates?periodicity=0';
const currentRatesFuncName = 'getCurrentRates';
const currentUsd = document.getElementById('usd_rate');
const currentEur = document.getElementById('eur_rate');
const currentRub = document.getElementById('rub_rate');
const yesterday = moment().subtract(1, 'days').format('YYYY-MM-DD');
const yesterdayRatesUrl = 'https://www.nbrb.by/api/exrates/rates?ondate=' + yesterday + '&periodicity=0';
const yesterdayRatesFuncName = 'showDifferenceBetweenRates';
const compareUsd = document.getElementById('usd_compare');
const compareEur = document.getElementById('eur_compare');
const compareRub = document.getElementById('rub_compare');
const usdDifferenceArea = document.getElementById('usd_compared_value');
const eurDifferenceArea = document.getElementById('eur_compared_value');
const rubDifferenceArea = document.getElementById('rub_compared_value');
const currenciesNamesUrl = 'https://www.nbrb.by/api/exrates/currencies';
const currenciesNamesFuncName = 'showCurrenciesNamesInSelector';
const selector = document.getElementById('currency_selector');

function getCurrentRates() {
    webWorker.postMessage([currentRatesUrl, currentRatesFuncName]);
}

function compareToYesterday() {
    webWorker.postMessage([yesterdayRatesUrl, yesterdayRatesFuncName]);
}

function getCurrenciesNames() {
    webWorker.postMessage([currenciesNamesUrl, currenciesNamesFuncName]);
}

webWorker.addEventListener('message', function (e) {
    const data = e.data[0];
    const funcName = e.data[1];
    switch (funcName) {
        case 'getCurrentRates':
            showCurrentRates(data);
            break;
        case 'showDifferenceBetweenRates':
            showDifferenceBetweenRates(data);
            break;
        case 'showCurrenciesNamesInSelector':
            showCurrenciesNamesInSelector(data);
            break;
        default:
            console.log('Something wrong with worker postmessage');
    }
})

function showCurrentRates(data) {
    data.forEach(el => {
        if (el.Cur_Abbreviation === 'USD') {
            currentUsd.innerText = el.Cur_OfficialRate;
        }
        if (el.Cur_Abbreviation === 'EUR') {
            currentEur.innerText = el.Cur_OfficialRate;
        }
        if (el.Cur_Abbreviation === 'RUB') {
            currentRub.innerText = el.Cur_OfficialRate;
        }
    });
}

function showDifferenceBetweenRates(data) {
    let usd = 0;
    let eur = 0;
    let rub = 0;
    let usdDifference = 0;
    let eurDifference = 0;
    let rubDifference = 0;
    data.forEach(el => {
        if (el.Cur_Abbreviation === 'USD') {
            usd = el.Cur_OfficialRate;
            usdDifference = usd - (+(currentUsd.textContent));
            usdDifferenceArea.innerText = usdDifference.toFixed(4);
            arrowPrint('usd_arrow', usdDifference);
        }
        if (el.Cur_Abbreviation === 'EUR') {
            eur = el.Cur_OfficialRate;
            eurDifference = eur - (+(currentEur.textContent));
            eurDifferenceArea.innerText = eurDifference.toFixed(4);
            arrowPrint('eur_arrow', eurDifference);
        }
        if (el.Cur_Abbreviation === 'RUB') {
            rub = el.Cur_OfficialRate;
            rubDifference = rub - (+(currentRub.textContent));
            rubDifferenceArea.innerText = rubDifference.toFixed(4);
            arrowPrint('rub_arrow', rubDifference);
        }
    })
}

function arrowPrint(el, value) {
    const element = document.getElementById(el)
    if (value >= 0) {
        element.src = 'img/greenArrow.png';
    } else element.src = 'img/redArrow.png';
}

function showCurrenciesNamesInSelector(data) {
    let sortedData = sortEqualCurrencyNames(data);
    currencies = sortedData;
    let namesArray = [];
    Object.values(sortedData).sort((a, b) => {
        if (a.CurName < b.CurName) return -1;
        if (a.CurName > b.CurName) return 1;
        return 0;
    }).forEach(el => {
        const element = document.createElement('option');
        element.textContent = el.CurName;
        element.value = el.currency;
        selector.appendChild(element);
    })
}

function sortEqualCurrencyNames(arr) {
    const result = [];
    arr.forEach(el => {
        if (!result[el.Cur_Abbreviation]) {
            result[el.Cur_Abbreviation] = {
                CurName: el.Cur_Name,
                currency: el.Cur_Abbreviation,
                payload: [],
            }
        }
        result[el.Cur_Abbreviation].payload.push({
            code: el.Cur_ID,
            startDate: el.Cur_DateStart,
            endDate: el.Cur_DateEnd,
        });
    })
    return result;
}

getCurrentRates();
compareToYesterday();
getCurrenciesNames();

function buildDiagramm() {
    const currency = currencies[selector.value];
    const startDateElement = document.getElementById('start_date');
    const endDateElement = document.getElementById('end_date');
    const startDate = moment(startDateElement.value);
    const endDate = moment(endDateElement.value);
    const periodicity = document.querySelector('input[name="frequency"]:checked').value;
    const urls = getUrls(currency, startDate, endDate);

    startFetchUrls(urls)
        .then(result => showChart(result.flat(), periodicity, endDate, currency))
        .catch(err => console.error(err));

}

function generateDayData(data, lastDate, currencyData) {
    data.forEach(el => {
        if (moment(el.Date).isSameOrBefore(lastDate)) {
            currencyData.push({
                date: moment(el.Date),
                dateStr: moment(el.Date).format('YYYY-MM-DD'),
                rate: el.Cur_OfficialRate
            })
        }
    })
}

function generateMonthData(data, lastDate, currencyData) {
    let counter = 0;
    let summ = 0;
    let month = 0;
    for (let i = 0; i < data.length; i++) {
        if (moment(data[i].Date).isSameOrBefore(lastDate)) {
            counter++;
            summ += data[i].Cur_OfficialRate;
            if (counter === 30) {
                month++;
                currencyData.push({
                    date: moment(data[i].Date),
                    dateStr: moment(data[i].Date).format('YYYY-MM'),
                    rate: +(summ / 30).toFixed(4)
                })
                counter = 0;
                summ = 0;
            }
        }
    }
}

function generateYearData(data, lastDate, currencyData) {
    let counter = 0;
    let summ = 0;
    for (let i = 0; i < data.length; i++) {
        const curDate = moment(data[i].Date);
        if (curDate.isSameOrBefore(lastDate)) {
            const nexDate = moment(data[i + 1].Date);
            if (curDate.year() !== nexDate.year() || curDate.isSame(lastDate)) {
                currencyData.push({
                    date: curDate,
                    dateStr: curDate.format('YYYY'),
                    rate: +(summ / counter).toFixed(4)
                })
                summ = 0;
                counter = 0;
            } else {
                counter++;
                summ += data[i].Cur_OfficialRate;
            }
        }
    }
}

function getUrls(currency, startDate, endDate) {
    return currency.payload.map(p => {
        const currStartDate = moment(p.startDate);
        const currEndDate = moment(p.endDate);
        let reqStartDate = moment.max(startDate, currStartDate);
        let reqEndDate = moment.min(endDate, currEndDate);
        let requests = [];
        while (reqStartDate.isBefore(reqEndDate)) {
            requests.push(`https://www.nbrb.by/api/exrates/rates/dynamics/${p.code}?startDate=${reqStartDate.format('YYYY-MM-DD')}&endDate=${reqStartDate.add(1, 'year').format('YYYY-MM-DD')}`);
        } return requests;
    }).flat();
}

function startFetchUrls(urls) {
    return Promise.all(urls.map((url) => {
        return fetch(url)
            .then(response => response.json());
    }))
}

function showChart(data, periodicity, endDate, currency) {
    let periodicityView = '';
    const currencyData = [];
    const lastDate = moment(endDate).format('YYYY-MM-DD');
    if (periodicity === 'day') {
        periodicityView = 'День';
        generateDayData(data, lastDate, currencyData);
    }
    if (periodicity === 'month') {
        periodicityView = 'Месяц';
        generateMonthData(data, lastDate, currencyData);
    }
    if (periodicity === 'year') {
        periodicityView = 'Год'
        generateYearData(data, lastDate, currencyData);
    }
    renderChart(currency, periodicityView, currencyData.sort(dateComparator));
}

function dateComparator(cur1, cur2) {
    if(cur1.date.isBefore(cur2.date)) return -1;
    if(cur1.date.isAfter(cur2.date)) return 1;
    return 0;
}

function renderChart(currency, periodicityView, currencyData) {
    const rates = currencyData.map(el => el.rate);
    const dates = currencyData.map(el => el.dateStr);
    Highcharts.chart('container', {

        title: {
            text: `График отношения белорусского рубля к ${currency.CurName} за выбранный период`
        },

        subtitle: {
            text: 'Источник: Национальный банк Республики Беларусь'
        },

        yAxis: {
            title: {
                text: 'BYN'
            }
        },

        xAxis: {
            title: {
                text: `Выбранная периодичность отображения - ${periodicityView}`
            },
            categories: dates
        },

        legend: {
            layout: 'vertical',
            align: 'right',
            verticalAlign: 'middle'
        },

        plotOptions: {
            series: {
                label: {
                    connectorAllowed: false
                },
            }
        },

        series: [{
            name: currency.CurName,
            data: rates
        }],

        responsive: {
            rules: [{
                condition: {
                    maxWidth: 500
                },
                chartOptions: {
                    legend: {
                        layout: 'horizontal',
                        align: 'center',
                        verticalAlign: 'bottom'
                    }
                }
            }]
        }
    });
}
//end schedule function