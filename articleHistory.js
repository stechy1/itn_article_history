// ==UserScript==
// @name         ITn article stats
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Jednoduch addon pro vizualizaci počtu zobrazených článků za den
// @author       You
// @match        https://www.itnetwork.cz/administracni-sekce
// @match        https://www.itnetwork.cz/administracni-sekce/*
// @grant        none
// @require      http://ajax.googleapis.com/ajax/libs/jquery/1.6.4/jquery.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/Chart.js/2.7.3/Chart.bundle.min.js
// ==/UserScript==

(function() {
    'use strict';
    let $ = window.jQuery;

    class ArticleManager {
        constructor(container, articlesHistory) {
            this._articlesHistory = articlesHistory;
            // div id=articleHistoryContainer - kontejner celého mého okna s manažerem
            this._container = container;
            this._chartConfig = this._createBaseConfig();
            this._chart = null;

        }

        _createBaseConfig() {
            return {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Historie prohlížení článků',
                        data: [],
                        //backgroundColor:
                        //backgroundColor: ["#3e95cd", "#8e5ea2","#3cba9f","#e8c3b9","#c45850"],
                        borderColor: "#3e95cd",
                        fill: false
                    },
                    {
                        label: 'Historie stažení článků',
                        data: [],
                        borderColor: "#c45850",
                        fill: false
                    }]
                },
                options: {
                    responsive: true,
                    tooltips: {
                        mode: 'index',
                        intersect: false
                    },
                    hover: {
                        mode: 'nearest',
                        intersect: true
                    }
                }
            };
        }

        _fillDropdownWithArticles(dropdown) {
            Object.keys(this._articlesHistory).forEach((value, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.innerHTML = value;

                dropdown.append(option);
            });
        }

        _prepareChartData(article) {
            const result = {
                labels: [],
                dataHistory: [],
                dataDownload: []
            };
            article.forEach((info, index) => {
                result.labels.push(info.day);
                const todayShow = info.count;
                const todayDownload = info.download || 0;
                const yesterday = article[index-1] || {};
                const deltaShow = Math.abs(todayShow - yesterday.count || 0);
                const deltaDownload = Math.abs(todayDownload - yesterday.download || 0);
                result.dataHistory.push(deltaShow);
                result.dataDownload.push(deltaDownload);
            });

            result.labels.reverse();
            result.dataHistory.reverse();
            result.dataDownload.reverse();
            return result;
        }

        _articleSelectHandler(selectedIndex) {
            const keys = Object.keys(this._articlesHistory);
            if (!keys) {
                return;
            }
            const articleKey = keys[selectedIndex];
            if (!articleKey) {
                return;
            }

            const selectedArticle = this._articlesHistory[articleKey];
            const chartData = this._prepareChartData(selectedArticle);
            this._chartConfig.data.labels = chartData.labels;
            this._chartConfig.data.datasets[0].data = chartData.dataHistory;
            this._chartConfig.data.datasets[1].data = chartData.dataDownload;
            this._chart.update();
        }

        init() {
            const self = this;
            const btnExit = $('<button class="btn btn-small btn-danger" style="float: right">X</button>');
            btnExit.click(() => {
                self._container.toggle();
            });
            const lblTitle = "Správce historie článků";

            const header = $('<div id="articleHistoryHeader" style="border-bottom: solid 1px black; padding: 4px; background: #3b94e0;"></div>');
            const body = $('<div id="articleHistoryBody" style="padding: 4px; height: 100%"></div>');

            const bodyTop = $('<div id="articleHistoryBodyTop" style="height: 88%;"></div>');
            const bodyBottom = $('<div id="articleHistoryBodyBottom" style="text-align: center;"></div>');

            const articleDropdown = $('<select style="width: 100%;"></select>');
            articleDropdown[0].onchange = (event) => {
                const selectedIndex = event.srcElement.selectedIndex;
                self._articleSelectHandler(selectedIndex);
            };
            this._fillDropdownWithArticles(articleDropdown);

            const canvas = $('<canvas id="articleChart" style="width: 100%; height: 100%;"></canvas>');

            bodyTop.append(canvas);
            bodyBottom.append(articleDropdown);

            body.append(bodyTop);
            body.append(bodyBottom);

            header.append(lblTitle);
            header.append(btnExit);

            this._container.append(header);
            this._container.append(body);

            this._chart = new Chart(canvas, this._chartConfig);
        }
    }

    // Your code here...
    const columnIndex_miniature = 0;
    const columnIndex_name = 1;
    const columnIndex_state = 2;
    const columnIndex_downloads = 4;
    const columnIndex_read = 5;

    const historyContainer = $('<div id="articleHistoryContainer" style="position: absolute; top: 20%; left: 25%; width: 50%; height: 70%; max-height: 70%; background: white; -webkit-box-shadow: 0px 5px 15px 0px rgba(0,0,0,0.7);-moz-box-shadow: 0px 5px 15px 0px rgba(0,0,0,0.7);box-shadow: 0px 5px 15px 0px rgba(0,0,0,0.7); display: none;"></div>');
    const btnStats = $('<a href="#"><i class="fa fa-history"></i> Historie</a>');
    btnStats[0].onclick = (e) => {
        e.preventDefault();
        historyContainer.toggle();
    };
    $("nav.button-bar.nav-bar ").append(btnStats);
    const articleTotalCount = parseInt($($('*:contains("Napsal jsi")')[7]).text().replace(/[^0-9\.]/g, ''), 10);
    const tables = $('.fancytable').children('tbody');
    //const todayIndex = new Date(new Date().setDate(23)).toLocaleDateString();
    const todayIndex = new Date().toLocaleDateString();
    //const todayIndex = date.getDate() + "-" + date.getMonth() + "-" + date.getFullYear();
    const articleHistory = JSON.parse(localStorage.getItem("articleHistory")) || [];
    $('article').append(historyContainer);

    function parseDownloadCount(text) {
        return text.replace(/[x, -]/g, '');
    }

    tables.each((i, table) => {
        const rows = $(table).children();
        if (rows.size() === 0) {
            return;
        }

        rows.each((j, row) => {
            // Preskoc radek s hlavickou tabulky == prvni sloupecek neobsahuje miniaturu
            if ($($(row).children()[columnIndex_miniature]).children().size() === 0) {
                return;
            }
            const articleName = $($($(row).children()[columnIndex_name]).children()[0]).text().trim();
            const articleState = $($($(row).children()[columnIndex_state])[0]).text().trim();
            const articleTotalReadParent = $($($(row).children()[columnIndex_read])[0]);
            const articleTotalRead = articleTotalReadParent.text().trim();
            const articleTotalDownloadText = $($($(row).children()[columnIndex_downloads])[0]).text().trim();
            const articleTotalDownloadParsed = parseDownloadCount(articleTotalDownloadText) || 0;

            if (articleState !== 'Publikovaný') {
                return;
            }

            if (!articleHistory[articleName]) {
                articleHistory[articleName] = [];
                let result = {'day': todayIndex, 'count': articleTotalRead, 'download': articleTotalDownloadParsed};
                articleHistory[articleName].push(result);
                articleTotalReadParent.html("0/" + articleTotalRead);
            } else {
                let history = articleHistory[articleName];
                // Kontrola, zda-li neaktualizujie ve stejny den po x-ty
                if (history[0].day !== todayIndex) {
                    let result = {'day': todayIndex, 'count': articleTotalRead, 'download': articleTotalDownloadParsed};
                    history.unshift(result);
                }

                let today = history[0];
                let yesterday = history[1] || history[0];
                let delta = today.count - yesterday.count;
                articleTotalReadParent.html(delta + "/" + today.count);

            }
        });
    });

    localStorage.setItem("articleHistory", JSON.stringify(articleHistory));

    new ArticleManager(historyContainer, articleHistory).init();

})();