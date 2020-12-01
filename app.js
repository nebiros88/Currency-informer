'use strict'
let currencies = {}; 
// current rates from NBRB

const currRatesUrl = 'https://www.nbrb.by/api/exrates/rates?periodicity=0';
const currRatesWorker = new Worker('workers/current_rates_worker.js');
const currentUsd = document.getElementById('usd_rate');
const currentEur = document.getElementById('eur_rate');
const currentRub = document.getElementById('rub_rate');

function getCurrentRates() {
    currRatesWorker.postMessage(currRatesUrl);
}

currRatesWorker.addEventListener('message', function(e) {
    const data = e.data;
    data.forEach(el => {
        if(el.Cur_Abbreviation === 'USD') {
            currentUsd.innerText = el.Cur_OfficialRate;
        }
        if(el.Cur_Abbreviation === 'EUR') {
            currentEur.innerText = el.Cur_OfficialRate;
        }
        if(el.Cur_Abbreviation === 'RUB') {
            currentRub.innerText = el.Cur_OfficialRate;
        }
    })
})

getCurrentRates();

// compare current rates to yesterday's rates to show changes in browser page by arrows and values
const yesterday = moment().subtract(1, 'days').format('YYYY-MM-DD');
const yesterdayRatesUrl = 'https://www.nbrb.by/api/exrates/rates?ondate='+ yesterday + '&periodicity=0';
const compareUsd = document.getElementById('usd_compare');
const compareEur = document.getElementById('eur_compare');
const compareRub = document.getElementById('rub_compare');

const yesterdayRatesWorker = new Worker('workers/yesterdayRatesWorker.js');

function compareToYesterday() {
    yesterdayRatesWorker.postMessage(yesterdayRatesUrl);
}

yesterdayRatesWorker.addEventListener('message', function(e) {
    const data = e.data;
    let usd = 0;
    let eur = 0;
    let rub = 0;
    let usdDifference = 0;
    let eurDifference = 0;
    let rubDifference = 0;
    const usdDifferenceArea = document.getElementById('usd_compared_value');
    const eurDifferenceArea = document.getElementById('eur_compared_value');
    const rubDifferenceArea = document.getElementById('rub_compared_value');
    data.forEach(el => {
        if(el.Cur_Abbreviation === 'USD') {
            usd = el.Cur_OfficialRate;
            usdDifference = usd - (+(currentUsd.textContent));
            usdDifferenceArea.innerText = usdDifference.toFixed(4);
            arrowPrint('usd_arrow', usdDifference);
        }
        if(el.Cur_Abbreviation === 'EUR') {
            eur = el.Cur_OfficialRate;
            eurDifference = eur - (+(currentEur.textContent));
            eurDifferenceArea.innerText = eurDifference.toFixed(4);
            arrowPrint('eur_arrow', eurDifference);
        }
        if(el.Cur_Abbreviation === 'RUB') {
            rub = el.Cur_OfficialRate;
            rubDifference = rub - (+(currentRub.textContent));
            rubDifferenceArea.innerText = rubDifference.toFixed(4);
            arrowPrint('rub_arrow', rubDifference);
        }
    })
} )

// arrow print in case of value minus or plus
function arrowPrint(el, value) {
    const element = document.getElementById(el)
    if(value >= 0) {
        element.src = 'img/greenArrow.png';
    } else element.src = 'img/redArrow.png';
}
//
compareToYesterday();

// get currencies names into the selector on  the page
const currenciesNamesUrl = 'https://www.nbrb.by/api/exrates/currencies';
const currenciesNamesWorker = new Worker('workers/allCurrenciesNamesWorker.js');
const selector = document.getElementById('currency_selector');

function getCurrenciesNames() {
    currenciesNamesWorker.postMessage(currenciesNamesUrl);
}

currenciesNamesWorker.addEventListener('message', function(e) {
    let data = e.data;
    let sortedData = sortEqualCurrencyNames(data);
    currencies = sortedData;
    Object.values(sortedData).forEach(el => {
        const element = document.createElement('option');
        element.textContent = el.CurName;
        element.value = el.currency;
        selector.appendChild(element);
    })
})

function sortEqualCurrencyNames(arr) {
    const result = {};
    arr.forEach(el => {
        if(!result[el.Cur_Abbreviation]) {
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

getCurrenciesNames();

function buildDiagramm() {
    const currency = currencies[selector.value];
    const startDateElement = document.getElementById('start_date');
    const endDateElement = document.getElementById('end_date');
    const startDate = moment(startDateElement.value);
    const endDate = moment(endDateElement.value);
    const periodicity = document.querySelector('input[name="frequency"]:checked').value;
    let urls = currency.payload.map(p => {
        const currStartDate = moment(p.startDate);
        const currEndDate = moment(p.endDate);
        let reqStartDate = moment.max(startDate, currStartDate);
        let reqEndDate = moment.min(endDate, currEndDate);
        let requests = [];
        while(reqStartDate.isBefore(reqEndDate)) {
            requests.push(`https://www.nbrb.by/api/exrates/rates/dynamics/${p.code}?startDate=${reqStartDate.format('YYYY-MM-DD')}&endDate=${reqStartDate.add(1, 'year').format('YYYY-MM-DD')}`);
        } return requests;
    }).flat();

   Promise.all(urls.map(url => 
    fetch(url)
    .then(response => response.json())
    .then(result =>{
        console.log(result);
    })
    .catch(err => console.log(err))
    ));

}

function showSchedule(data, periodicity) {
    const startDate = moment(data[0].Date).format('YYYY-MM-DD');
    const endDate = moment(data[data.length - 1].Date).format('YYYY-MM-DD');
    
    let schedule = Highcharts.chart('container', {

        title: {
            text: 'Solar Employment Growth by Sector, 2010-2016'
        },
    
        subtitle: {
            text: 'Source: thesolarfoundation.com'
        },
    
        yAxis: {
            title: {
                text: 'Number of Employees'
            }
        },
    
        xAxis: {
            accessibility: {
                rangeDescription: 'Range: 2010 to 2017'
            }
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
                pointStart: 2010
            }
        },
    
        series: [{
            name: 'Installation',
            data: [43934, 52503, 57177, 69658, 97031, 119931, 137133, 154175]
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




















