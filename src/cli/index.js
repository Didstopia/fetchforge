const program = require('commander')
const { prompt } = require('inquirer')
const pkg = require('../../package.json')

const r2 = require('r2')
const scrapeIt = require('scrape-it')

// TODO: Refactor everything to their own files to separate logic as clearly as possible

const download = async(username) => {
  // TODO: Sanitize username to avoid any further issues (alphanumeric only?)

  console.log('Downloading clips from user:', username)

  let url = 'https://forge.gg/' + username

  // TODO: Could we potentially parse the React stuff to a JSON object?

  // NOTE: Works
  r2(url).response
  .then(response => response.text())
  .then(body => console.log('Body:', body))

  // NOTE: Works
  /* let response = await r2(url, {
    headers: {
      'User-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 8_0 like Mac OS X) AppleWebKit/600.1.3 (KHTML, like Gecko) Version/8.0 Mobile/12A4345d Safari/600.1.4'
    }
  }).response
  console.log('Response:', response) */

  // NOTE: Doesn't work
  /* let html = await r2(url, {
    headers: {
      'User-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 8_0 like Mac OS X) AppleWebKit/600.1.3 (KHTML, like Gecko) Version/8.0 Mobile/12A4345d Safari/600.1.4'
    }
  }).text
  console.log('HTML:', html) */

  // NOTE: Doesn't work
  /* await scrapeIt({
    url: url,
    headers: {
      'User-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 8_0 like Mac OS X) AppleWebKit/600.1.3 (KHTML, like Gecko) Version/8.0 Mobile/12A4345d Safari/600.1.4'
    }
  }).then(page => {
    console.log('Page:', page)
  }) */
}

// TODO: We should also support a fully interactive mode,
//       where the app is ran without any arguments and the
//       user is then prompted for any missing values (also ask for optional values?)
program
.version(pkg.version)
.description(pkg.description)

// TODO: I'm not really sure if this is a good way to go about it, because arguments might be better, no?
program
.command('download [username]') // NOTE: <required> [optional]
.alias('d')
.description('Download clips from a specific user')
.action(async(username) => {
  // TODO: Come up with a good way to do input validation
  if (!username) {
    prompt({ type: 'input', name: 'username', message: 'Username to download from:' }).then(async(answers) => {
      if (answers['username']) {
        await download(answers.username)
      } else {
        // TODO: Come up with a good way to handle errors
        console.log('Error: username is required')
        process.exit(0)
      }
    })
  } else {
    await download(username)
  }
})

console.log('Parsing arguments')

program.parse(process.argv)

console.log('Finished')
