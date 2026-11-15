import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

async function delayFileReads(page){
  await page.addInitScript(()=>{
    const read=File.prototype.text;window.releaseFileReads={};window.startedDigests=0;window.finishedDigests=0;
    const digest=crypto.subtle.digest.bind(crypto.subtle);
    crypto.subtle.digest=async(...args)=>{window.startedDigests++;try{return await digest(...args);}finally{window.finishedDigests++;}};
    File.prototype.text=function(){
      if(!this.name.startsWith('delayed-'))return read.call(this);
      return new Promise(resolve=>{window.releaseFileReads[this.name]=async()=>resolve(await read.call(this));});
    };
  });
}

async function getDownload(page,button){
  const wait=page.waitForEvent('download');
  await button.click();
  const download=await wait;
  return {download,content:await readFile(await download.path(),'utf8')};
}

test('pinned punctuation matches while a negated clause needs review',async({page})=>{
  await page.goto('/');
  const source='Deploy on Friday.';
  await page.locator('#source').fill(source);
  await page.locator('#source').evaluate((el)=>{el.focus();el.setSelectionRange(0,el.value.length);});
  await page.locator('#pin').click();
  await page.locator('#summary').fill('Deploy on Friday.');await page.locator('#compare').click();
  await expect(page.locator('#exact-count')).toHaveText('1');
  await page.locator('#summary').fill('The team decided they should never deploy on Friday.');await page.locator('#compare').click();
  await expect(page.locator('#review-count')).toHaveText('1');
  await expect(page.locator('.rule')).toContainText('Negation or denial');
});

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

test('unfinished text and report imports preserve newer workspace changes',async({page})=>{
  await delayFileReads(page);await page.goto('/');await page.locator('#demo').click();
  const saved=await getDownload(page,page.locator('#report'));
  await page.locator('#source-file').setInputFiles({name:'delayed-source.txt',mimeType:'text/plain',buffer:Buffer.from('Old imported source.')});
  await page.locator('#source').fill('The latest typed source.');
  await page.evaluate(()=>window.releaseFileReads['delayed-source.txt']());
  await expect(page.locator('#source')).toHaveValue('The latest typed source.');

  await page.locator('#summary-file').setInputFiles({name:'delayed-summary.txt',mimeType:'text/plain',buffer:Buffer.from('Old imported summary.')});
  await page.locator('#demo').click();const summary=await page.locator('#summary').inputValue();
  await page.evaluate(()=>window.releaseFileReads['delayed-summary.txt']());
  await expect(page.locator('#summary')).toHaveValue(summary);await expect(page.locator('.rule')).toHaveCount(5);

  await page.locator('#report-file').setInputFiles({name:'delayed-report.json',mimeType:'application/json',buffer:Buffer.from(saved.content)});
  await page.locator('#summary').fill('My newer summary edit.');
  const before=await page.evaluate(()=>window.startedDigests);
  await page.evaluate(()=>window.releaseFileReads['delayed-report.json']());
  await expect.poll(()=>page.evaluate(()=>window.startedDigests)).toBeGreaterThanOrEqual(before+2);
  await expect.poll(()=>page.evaluate(()=>window.finishedDigests===window.startedDigests)).toBe(true);
  await expect(page.locator('#summary')).toHaveValue('My newer summary edit.');await expect(page.locator('#report')).toBeDisabled();
});

test('invalid but hash-consistent reports leave the current review intact',async({page})=>{
  await page.goto('/');await page.locator('#demo').click();
  const saved=await getDownload(page,page.locator('#report')),report=JSON.parse(saved.content);
  const source=await page.locator('#source').inputValue(),summary=await page.locator('#summary').inputValue();
  const upload=async value=>page.locator('#report-file').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(value))});
  await upload({...report,constraints:[]});await expect(page.locator('#status')).toContainText('at least one source rule');
  await expect(page.locator('#source')).toHaveValue(source);await expect(page.locator('#summary')).toHaveValue(summary);await expect(page.locator('.rule')).toHaveCount(5);
  await upload({...report,summary:'',summarySha256:createHash('sha256').update('').digest('hex')});await expect(page.locator('#status')).toContainText('non-empty');
  await expect(page.locator('#source')).toHaveValue(source);await expect(page.locator('#summary')).toHaveValue(summary);await expect(page.locator('.rule')).toHaveCount(5);await expect(page.locator('#report')).toBeEnabled();
});
