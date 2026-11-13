import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

async function getDownload(page,button){
  const wait=page.waitForEvent('download');
  await button.click();
  const download=await wait;
  return {download,content:await readFile(await download.path(),'utf8')};
}

test('local workbench: analysis, evidence, export and responsive layout',async({page},testInfo)=>{
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const done=[];
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang','en');
      await page.locator('#demo').click();await expect(page.locator('.rule')).toHaveCount(5);await expect(page.locator('#exact-count')).toHaveText('1');
      const report=await getDownload(page,page.locator('#report'));const parsed=JSON.parse(report.content);expect(parsed.constraints).toHaveLength(5);
      await page.locator('#report-file').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...parsed,source:'tampered'}))});await expect(page.locator('#status')).toContainText('fingerprint');
      await page.locator('#report-file').setInputFiles({name:'good.json',mimeType:'application/json',buffer:Buffer.from(report.content)});await expect(page.locator('#status')).toContainText('restored');
      const note=await getDownload(page,page.locator('#recovery'));expect(note.content).toContain('Never send');
      await page.locator('#summary').fill('Updated');await expect(page.locator('#report')).toBeDisabled();await page.locator('#demo').click();done.push('Source-linked 5-rule comparison','Hash-validated report roundtrip/tamper rejection','Recovery note export','Changed input invalidates verdict');
  await page.screenshot({path:testInfo.outputPath('desktop.png'),fullPage:false});
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:testInfo.outputPath('mobile.png'),fullPage:false});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1)).toBe(false);
  expect(errors).toEqual([]);
});
