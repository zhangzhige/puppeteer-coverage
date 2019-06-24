const fs = require('fs');
const OutputFiles = require('./output-files');
const mkdirp = require('mkdirp');
const PuppeteerToV8 = require('./puppeteer-to-v8');
const v8toIstanbul = require('v8-to-istanbul');
var remapIstanbul = require('remap-istanbul');
const pathLib = require('path');

class PuppeteerToIstanbul {

  constructor(coverageInfo, options) {
    this.coverageInfo = coverageInfo;
    this.options = options;
    
    this.coverageInfo.forEach(fileItem => {
      let text = fileItem.sourceMap;
      OutputFiles([{url: fileItem.sourceMapUrl, text: text}]);
    });

    this.puppeteerToConverter = OutputFiles(coverageInfo).getTransformedCoverage();
    this.puppeteerToV8Info = PuppeteerToV8(this.puppeteerToConverter).convertCoverage();
  }

  setCoverageInfo(coverageInfo) {
    this.coverageInfo = coverageInfo
  }

  writeIstanbulFormat() {
    var fullJson = {};

    this.puppeteerToV8Info.forEach(jsFile => {
      const script = v8toIstanbul(jsFile.url);
      script.applyCoverage(jsFile.functions);

      let istanbulCoverage = script.toIstanbul();
      let keys = Object.keys(istanbulCoverage);
      fullJson[keys[0]] = istanbulCoverage[keys[0]]
    });

    mkdirp.sync(this.options.nyc_output_path);
    const path = pathLib.resolve(this.options.nyc_output_path,  'out.json')
    console.log('path=', path);

    fs.writeFileSync(path, JSON.stringify(fullJson), 'utf8');

    remapIstanbul(path, {
      'json': path,
    });

    const text = JSON.parse(fs.readFileSync(path, 'utf8'));
    
    Object.keys(text).map(key => {
      const coverage_item = text[key];
      const path = coverage_item['path'];
      if (fs.existsSync(path) && (!this.options.filterCoverageFile || !this.options.filterCoverageFile(path))) {

      } else {
        delete text[key]
      }
    });
    fs.writeFileSync(path, JSON.stringify(text), 'utf8');
  }
}

module.exports = function (coverageInfo, options) {
  return new PuppeteerToIstanbul(coverageInfo, options)
}
