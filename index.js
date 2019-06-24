const PuppeteerToIstanbul = require('./src/puppeteer-to-istanbul');
const {saveCoverage, loadAllCoverage} = require('./src/coverage_file')
module.exports = {
    output: async (options) => {
        const coverageData = await loadAllCoverage(options);
        PuppeteerToIstanbul(coverageData, options).writeIstanbulFormat()
    },
    saveCoverage,
};
