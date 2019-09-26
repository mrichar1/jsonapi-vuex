// For authoring Nightwatch tests, see
// http://nightwatchjs.org/guide#usage

module.exports = {
  'default e2e tests': (browser) => {
    browser
      .url(process.env.VUE_DEV_SERVER_URL)
      .waitForElementVisible('#app', 5000)

    // Shorthand to stop typing browser.expect over and over
    const be = browser.expect

    be.element('#main-div').to.be.present
    be.element('#main-div h1').text.to.equal('JSONAPI Vuex Test App')

    be.element('#raw_data').to.be.present
    be.element('#raw_data h2').text.to.equal('Raw Data')

    // Values from initial API get in table
    be.element('#render_data').to.be.present
    be.element('#render_data h2').text.to.equal('Rendered Data')
    be.element('#span_name_1').text.to.equal('sprocket')
    be.element('#span_color_1').text.to.equal('black')

    // Expanded related objects
    be.element('#rel_span_relname').text.to.equal('widgets')
    be.element('#rel_span_name').text.to.equal('gear')
    be.element('#rel_span_color').text.to.equal('blue')

    // Values from initial API search in table
    be.element('#search_name_1').text.to.equal('sprocket')
    be.element('#search_color_1').text.to.equal('black')

    // Inputs exist and have correct values
    be.element('#patch').to.be.present
    be.element('#patch_name').value.to.be.equal('sprocket')
    be.element('#patch_color').value.to.be.equal('black')

    // Modify values
    browser.clearValue('#patch_name')
    browser.setValue('#patch_name', 'cog')
    browser.clearValue('#patch_color')
    browser.setValue('#patch_color', 'red')

    // Move so that element is in view (Firefox doesn't render items off-screen)
    browser.getLocationInView('button[name=patch_button]')
    browser.click('button[name=patch_button]')
    // Pause for API response
    browser.pause(1000)

    // Check changes propagate
    be.element('#span_name_1').text.to.equal('cog')
    be.element('#span_color_1').text.to.equal('red')

    // Create new item
    browser.setValue('#post_name', 'wheel')
    browser.setValue('#post_color', 'green')

    // Move so that element is in view (Firefox doesn't render items off-screen)
    browser.getLocationInView('button[name=post_button]')
    browser.click('button[name=post_button]')
    // Pause for API response
    browser.pause(1000)

    // Check changes propagate
    be.element('#span_name_4').text.to.equal('wheel')
    be.element('#span_color_4').text.to.equal('green')

    // Delete an item
    be.element('#span_name_1').to.be.present
    browser.setValue('#delete_id', '1')
    // Move so that element is in view (Firefox doesn't render items off-screen)
    browser.getLocationInView('button[name=delete_button]')
    browser.click('button[name=delete_button]')
    // Pause for API response
    browser.pause(1000)

    be.element('#span_name_1').to.not.be.present

    browser.end()
  },
}
