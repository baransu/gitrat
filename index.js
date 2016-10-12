#! /usr/bin/env node

'use strict';

const path = require('path');
const fs = require('fs');
const request = require('request');
const settings = require('user-settings').file('.gitrat');

var mode = "watch";
const MODES = {

  token: function token() {
    let token = "";
    process.argv.forEach(function (val, index, array) {
      if(index == 3) token = val;
    });

    if(token == "") logAndExit(['I cannot save empty token.']);
    settings.set("GITRAT_TOKEN", token);
    logAndExit(['I successfully stored your token.']);
  },

  init: function init() {
    logAndExit(['init mode not supported']);
  },

  watch: function watch() {
    const TOKEN = getToken();
    getConfig((err, file) => {
      if(err) {
        logAndExit(['I have trouble reading rat.json file. Maybe you have to create one yourself?']);
      }

      let config = JSON.parse(file);

      if(config.projectId !== undefined) {
        watchBuild(config.projectId, TOKEN);
      } else {
        // projectName is required
        if(config.projectName === undefined) {
          logAndExit(['You have to define projectName in your rat.json file.']);
        }

        request({
          uri: 'https://gitlab.com/api/v3/projects/',
          headers: {
            "PRIVATE-TOKEN": TOKEN
          }
        }, function (error, response, body) {
          if (!error && response.statusCode == 200) {
            const projectName = config.projectName;
            const project = JSON.parse(body).find(p => p.path == projectName || p.name == projectName);
            if(!project) {
              logAndExit(['I could not find project with name you provided in rat.json']);
            }

            config.projectId = project.id;

            fs.writeFile(path.join(process.cwd(), 'rat.json'), JSON.stringify(config, null, 2), function(err) {
              if(err) {
                logAndExit(['I could not update your rat.json file.']);
              }
              // run wath by id
              watchBuild(config.projectId, TOKEN);
            });
          } else {
            logAndExit(['I could not connect to gitlab to get projectId.']);
          }
        });
      }
    });
  }
};

process.argv.forEach(function (val, index, array) {
  if(index == 2) mode = val;
});

if(MODES[mode] !== undefined) {
  MODES[mode]();
} else {
  console.log('I cannot find this command. Try one of listed bellow.\n');
  Object.keys(MODES).forEach(m => {
    console.log(`labrat ${m}`);
  });
  console.log('\n');
}

function getToken() {
  const TOKEN = settings.get("GITRAT_TOKEN");
  if(TOKEN === undefined) {
    logAndExit([
      `I could not find your Gitlab token.`,
      `Set it by running this command:\n`,
      `gitrat token gitlab_token\n\n`
    ]);
  }
  return TOKEN;
}

function getConfig(callback) {
  const filePath = path.join(process.cwd(), 'rat.json');
  fs.readFile(filePath, 'utf-8', callback);
}


function logAndExit(messages) {
  messages.forEach(m => console.log(m));
  process.exit(0);
}

let firstTime = true;
function watchBuild(projectId, token) {
  request({
    uri: `https://gitlab.com/api/v3/projects/${projectId}/builds`,
    headers: {
      "PRIVATE-TOKEN": token
    }
  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      const builds = JSON.parse(body);
      if(builds.length > 0) {
        const status = builds[0].status;
        const finishedStates = ['failed', 'success'];
        const inProgressStates = ['running', 'pennding'];
        if(finishedStates.indexOf(status) > -1) {
          logAndExit([`Your last build: ${status}`]);
          // run acumulated process
        } else if(inProgressStates.indexOf(status) > -1) {
          if(firstTime) {
            console.log(`I've found your project and I'm starting to watch it.`);
            firstTime = false;
          }
          setTimeout(() => {
            watchBuild(projectId, token);
          }, 10000);
        } else {
          logAndExit(['I could not understand your build status.']);
        }
      } else {
        logAndExit([`You don't have any builds within this project.`]);
      }
    } else {
      logAndExit(['I could not get list of last builds. Maybe your token is not valid?']);
    }
  });
}
