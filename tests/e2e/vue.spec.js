import { expect, test } from '@playwright/test'

let page

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage()
  await page.goto('localhost:5173')
})

test('Has main div', async () => {
  expect(await page.locator('#main-div').isVisible()).toBe(true)
})

test('Has h1 title', async () => {
  expect(await page.locator('div#main-div > h1')).toHaveText('JSONAPI Vuex Test App')
})

test('Has raw data div', async () => {
  expect(await page.locator('#raw_data').isVisible()).toBe(true)
})

test('Has h2 raw title', async () => {
  expect(await page.locator('div#raw_data > h2')).toHaveText('Raw Data')
})

test('Has render data div', async () => {
  expect(await page.locator('#render_data').isVisible()).toBe(true)
})

test('Has h2 render title', async () => {
  expect(await page.locator('div#render_data > h2')).toHaveText('Rendered Data')
})

test('Has initial API data', async () => {
  expect(await page.locator('#span_name_1')).toHaveText('sprocket')
  expect(await page.locator('#span_color_1')).toHaveText('black')
})

test('Has related objects', async () => {
  expect(await page.locator('#rel_span_relname')).toHaveText('widgets')
  expect(await page.locator('#rel_span_name')).toHaveText('gear')
  expect(await page.locator('#rel_span_color')).toHaveText('blue')
})

test('Has initial API search data', async () => {
  expect(await page.locator('#search_name_1')).toHaveText('sprocket')
  expect(await page.locator('#search_color_1')).toHaveText('black')
})

test('Inputs exist and have correct values ', async () => {
  expect(await page.locator('#patch').isVisible()).toBe(true)
  expect(await page.locator('#patch_name')).toHaveValue('sprocket')
  expect(await page.locator('#patch_color')).toHaveValue('black')
})

test('Patch values', async () => {
  expect(await page.locator('#patch_name').fill('cog'))
  expect(await page.locator('#patch_color').fill('red'))
  await page.getByRole('button', { name: 'Patch' }).click()
  await page.waitForTimeout(1000)
  expect(await page.locator('#span_name_1')).toHaveText('cog')
  expect(await page.locator('#span_color_1')).toHaveText('red')
})

test('Post new item', async () => {
  expect(await page.locator('#post_name').fill('wheel'))
  expect(await page.locator('#post_color').fill('green'))
  await page.getByRole('button', { name: 'Post' }).click()
  await page.waitForTimeout(1000)
  expect(await page.locator('#span_name_4')).toHaveText('wheel')
  expect(await page.locator('#span_color_4')).toHaveText('green')
})

test('Delete an item', async () => {
  expect(await page.locator('#span_name_1').isVisible()).toBe(true)
  expect(await page.locator('#delete_id').fill('1'))
  await page.getByRole('button', { name: 'Delete' }).click()
  await page.waitForTimeout(1000)
  expect(await page.locator('#span_name_1').isVisible()).toBe(false)
})
