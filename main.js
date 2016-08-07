var Crawler = require("node-webcrawler");
var fs = require('fs');

const START_URL = 'http://dig.ccmixter.org/dig?limit={limit}&offset={offset}&tags=ambient%2Cballad%2Cbeat%2Cchill%2Cclassic%2Cdance%2Cdark%2Cdowntempo%2Cacoustic%2Cbass%2Cbeats%2Cbrass%2Ccello%2Cdrums%2Celectronic%2Cflute%2Cacid%2Calternative%2Cblues%2Cbreaks%2Cchristmas%2Cclassical%2Ccountry%2Cdnb%2Cdub%2Cdubstep%2Celectro%2Celectronica%2Cfolk%2Cfunk%2Cglitch%2Chip_hop%2Chouse%2Cindie%2Cjazz%2Clatin%2Cmusic_for_film%2Cpop%2Creggae%2Crock%2Csoul%2Ctechno%2Ctrance%2Ctrip_hop%2Cworld%2Cguitar%2Charmonies%2Cloops%2Corchestral%2Corgan%2Cpads%2Cpercussion%2Cpiano%2Cpoem%2Cpoetry%2Crhodes%2Csaxophone%2Cscratching%2Csolo%2Cspoken_word%2Csynthesizer%2Ctrumpet%2Cviolin%2Celectric%2Cexperimental%2Cfunky%2Cgroove%2Cjazzy%2Clove%2Cmusic_for_video%2Cnoise';
const DOWNLOAD_URL_TEMPLATE = 'http://ccmixter.org/content/{author}/{author}_-_{title}.mp3';
const SONGS_AMOUNT_PER_PAGE = 1000;

const SONGS_JSON_PATH = 'songs.json';
const DOMAIN = 'http://dig.ccmixter.org';

var songs = [];
var amount_songs_crawled = 0;
var total_amount_songs_to_crawl;

var songsCrawler = new Crawler({
    maxConnections: 50,
    timeout: 60000,
    userAgent: 'hehe',
    callback: function (error, result, $) {
        if (result.statusCode != 200) {
            console.log(result.uri);
            return;
        }
        try {

            amount_songs_crawled += 1;
            console.log('{percentage}% ({amount_crawled}/{total_crawled})'
                .replace('{percentage}', (amount_songs_crawled / total_amount_songs_to_crawl * 100).toFixed(2))
                .replace('{amount_crawled}', amount_songs_crawled)
                .replace('{total_crawled}', total_amount_songs_to_crawl)
            );

            var name = $('.page-header').find('h1').eq(0).text();
            var author = result.uri.split('/')[4];

            var downloadUrl = DOWNLOAD_URL_TEMPLATE
                .replace(/\{author}/g, author)
                .replace(/\{title}/g, name.replace(/ /g, '_'));

            var tags = [];
            $('.tags').children().first().children().each(function (index, element) {
                var tag = $(this).attr('href').split(/\//)[2];
                tags.push(tag);
            });

            var license = $('.download-license').attr('src').split('/')[4];

            songs.push({
                name: name,
                author: author,
                tags: tags,
                license: license,
                url: downloadUrl
            });
        } catch (e) {
            console.log(e.message);
        }
    },
    onDrain: function (pool) {
        fs.writeFile(
            SONGS_JSON_PATH,
            JSON.stringify(songs, null, 4),
            function (err) {
                if (err)
                    console.error("Error: Could not save songs to json.");
                else
                    console.log("Songs saved to '" + SONGS_JSON_PATH + "' file");
            }
        )
    }
});

var songsListCrawler = new Crawler({
    maxConnections: 10,
    timeout: 60000,
    userAgent: 'hehe',
    callback: function (error, result, $) {
        if (result.statusCode != 200) {
            console.log(result.uri);
            return;
        }

        var songNodes = $('.play-list').children();
        songNodes.each(function (index, element) {
            var songUrl = DOMAIN + $(this).find('.song-title').eq(0).attr('href');

            songsCrawler.queue(songUrl);
        });
        console.log("page_crawled");
    },
    onDrain: function (pool) {
        pool.destroyAllNow()
    }
});

var startCrawler = new Crawler({
    maxConnections: 10,
    timeout: 60000,
    userAgent: 'hehe',
    callback: function (error, result, $) {
        total_amount_songs_to_crawl = parseInt($('.paging-caption').text().split(' ')[4].replace(',', ''));
        for (var offset = 0; offset < total_amount_songs_to_crawl; offset += SONGS_AMOUNT_PER_PAGE) {
            var pageUrl = START_URL
                .replace('{offset}', offset)
                .replace('{limit}', SONGS_AMOUNT_PER_PAGE);
            songsListCrawler.queue(pageUrl);
        }
    },
    onDrain: function (pool) {
        pool.destroyAllNow()
    }
});

startCrawler.queue(START_URL
    .replace('{offset}', 0)
    .replace('{limit}', 5)
);

