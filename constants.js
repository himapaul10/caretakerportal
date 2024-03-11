require('dotenv').config({ path: './.env' });

const FDABaseUrl = 'https://api.fda.gov/drug/label.json';

module.exports = {
    FDABaseUrl: FDABaseUrl
};