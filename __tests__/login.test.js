require('dotenv').config();

beforeAll(async () => {
    await page.goto('http://127.0.0.1:2009');
    await page.setDefaultTimeout(2000);
});

describe('the login handler', () => {
    it('should deny nonexistent accounts', async () => {
        await expect(page).toFillForm('form[id="credentials"]', {
            email: "a@a",
            password: "pæsswørd",
        });
        await expect(page).toClick("button", { text: "Done :)" });
        await expect(page).toMatchElement('#email[class="fail"]');
    });
    it('should deny incorrect passwords', async () => {
        await expect(page).toFillForm('form[id="credentials"]', {
            email: process.env.LITAUTH_EMAIL,
            password: "pæsswørd",
        });
        await expect(page).toClick("button", { text: "Done :)" });
        await expect(page).toMatchElement('#password[class="fail"]');
    });
    it('should redirect valid login details', async () => {
        await expect(page).toFillForm('form[id="credentials"]', {
            email: process.env.LITAUTH_EMAIL,
            password: process.env.LITAUTH_PASSWORD,
        });
        await expect(page).toClick("button", { text: "Done :)" });
        await expect(page).toMatchElement('#planet[class="moveplanet"]');
        await page.reload();
        await expect(page.url()).toMatch('http://127.0.0.1:2009/client.html');
    });
});