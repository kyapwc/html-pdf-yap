const hb = require('handlebars')
const chromium = require('chrome-aws-lambda')
const Promise = require('bluebird')

module.exports.generatePdf = async (file, options, callback) => {
  const args = [
    '--no-sandbox',
    '--headless',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--single-process',
    '--no-zygote',
    '--disable-setuid-sandbox',
  ]

  const BROWSERS_MAP = {
    darwin: {
      firefox: '/Applications/Firefox.app/Contents/MacOS/firefox',
      chrome: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    },
  }

  const browser = await chromium.puppeteer.launch({
    args,
    executablePath: !options.isTest ? await chromium.executablePath : BROWSERS_MAP[options.platform][options.browser],
    headless: chromium.headless,
  })

  const page = await browser.newPage()

  if (file.content) {
    console.log('Compiling the template with handlebars')
    const template = hb.compile(file.content, { strict: true })

    const result = template(file.content)
    await page.setContent(result)
  } else {
    await page.goto(file.url, {
      waitUntil: 'networkidle0',
    })
  }
  // wait 2 seconds for all content to be available
  await page.waitForTimeout(2000)

  return Promise.props(page.pdf(options))
    .then(async (data) => {
      console.log('data: ', data)
      await browser.close()
      return Buffer.from(Object.values(data))
    }).asCallback(callback)
}
