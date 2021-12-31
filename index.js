/*
Features 
translate => translate one text
listAvailableLanguages => fetch all available languages
generateXMLStrings => translate entire strings.localizable
*/

const fs = require("fs");
const xml2js = require("xml2js");

// Imports the Google Cloud client library
const { Translate } = require("@google-cloud/translate").v2;

// global variable
let googleAPI;

const config = {
  googleApiCredential: "",
  googleApiProjectId: "",
  log: true,
};

function configure(configObj) {
  config.googleApiCredential = configObj["googleApiCredential"];
  config.googleApiProjectId = configObj["googleApiProjectId"];
  config.log = configObj["log"];
  googleAPI = new Translate({
    credentials: config.googleApiCredential,
    projectId: config.googleApiProjectId,
  });
}

function validate() {
  if (!config.googleApiCredential) {
    throw new Error("Must provided Google API Credential");
  }
  if (!config.googleApiProjectId) {
    throw new Error("Must provided Google API projectId");
  }
}

// first argument: "text"
// second argument:
// example {from: "ko", to: "en"}
async function translate(text, translateObj) {
  validate();
  try {
    let [translation] = await googleAPI.translate(text, translateObj);
    if (config.log) {
      console.log(`word to be translated ===> ${text}`);
      console.log(`translated word ===> ${translation}`);
    }
    return translation;
  } catch (error) {
    console.log(`Error ===> ${error}`);
    return 0;
  }
}

async function listAvailableLanguages() {
  // Lists available translation language with their names in English (the default).
  const [languages] = await googleAPI.getLanguages();
  if (config.log) {
    languages.forEach((language) => console.log(language));
  }
  return languages;
}

async function createTranslationObjectList(pathToXML) {
  const parser = new xml2js.Parser();
  const xmlString = fs.readFileSync(pathToXML, "utf8");
  const result = await parser.parseStringPromise(xmlString);
  // console.log(result.resources.string["_"]);
  const json = result.resources.string.map((element) => {
    return {
      key: element["$"]["name"],
      value: element["_"],
    };
  });
  return json;
}

async function generateXMLStrings(options) {
  const { input, output, from, to } = options;
  const data = {};
  for (let i = 0; i < to.length; i++) {
    const translationObjectList = await createTranslationObjectList(input);
    let xmlValuesString = `<?xml version="1.0" encoding="utf-8"?>\n`;
    xmlValuesString += `<resources>\n`;
    data[to[i]] = [];
    for (translationObject of translationObjectList) {
      const key = translationObject.key;
      const value = translationObject.value;
      const translation = await translate(value, {
        from: from,
        to: to[i],
      });
      xmlValuesString += `\t<string name="${key}">${translation}</string>\n`;
      data[to[i]].push({ key: key, value: value });
    }
    xmlValuesString += "</resources>";
    xmlValuesString = xmlValuesString.replace(/'/g, "\\'");
    const outputDir = `${output}/values-${to[i]}`;
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    fs.writeFileSync(`${outputDir}/strings.xml`, xmlValuesString);
  }
}

module.exports = {
  translate,
  configure,
  listAvailableLanguages,
  generateXMLStrings,
};
