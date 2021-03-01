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

  const browser = await chromium.puppeteer.launch({
    args,
    executablePath: await chromium.executablePath,
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
  await page.waitForSelector('.qrTitle:not(:empty)')

  return Promise.props(page.pdf(options))
    .then(async (data) => {
      await browser.close()
      return Buffer.from(Object.values(data))
    }).asCallback(callback)
}
