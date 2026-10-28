import {test,expect} from "@playwright/test";
test("landing and catalog navigation",async({page})=>{await page.goto("/");await expect(page.getByRole("heading",{name:/COMPITE EN/i})).toBeVisible();await page.getByRole("link",{name:"Explorar torneos"}).first().click();await expect(page).toHaveURL(/torneos/);});
