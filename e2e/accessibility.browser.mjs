import {test,expect} from '@playwright/test';
async function tabTo(page,target){for(let i=0;i<110;i++){if(await target.evaluate(el=>el===document.activeElement))return;await page.keyboard.press('Tab');}throw Error('Control is not reachable with Tab');}
test('removing the last rule returns visible focus to pinning in short viewports',async({page})=>{
  for(const viewport of [{width:640,height:512},{width:320,height:256}]){
    await test.step(`last-rule fallback at ${viewport.width}x${viewport.height}`,async()=>{
      await page.setViewportSize(viewport);await page.goto('/');
      await page.locator('#source').fill('Deploy on Friday.');
      await page.locator('#source').press('Control+A');
      await tabTo(page,page.locator('#pin'));await page.keyboard.press('Enter');
      const remove=page.getByRole('button',{name:/^Remove rule:/});
      await tabTo(page,remove);await page.keyboard.press('Enter');
      await expect(page.locator('.rule')).toHaveCount(0);
      await expect(page.locator('#pin')).toBeFocused();
      await expect.soft(page.locator('#pin')).toBeInViewport({ratio:1});
    });
  }
});
test('keyboard rule review preserves focus and an emptied rule list returns to pinning',async({page})=>{
  await page.goto('/');await tabTo(page,page.locator('#demo'));await page.keyboard.press('Enter');
  await tabTo(page,page.locator('#report-file'));expect(await page.locator('label[for="report-file"]').evaluate(el=>getComputedStyle(el).outlineStyle)).toBe('solid');
  const review=page.locator('[data-rule-action="review"]').first();await tabTo(page,review);const id=await review.getAttribute('data-rule-id');await page.keyboard.press('Enter');
  await expect(page.locator(`[data-rule-id="${id}"][data-rule-action="review"]`)).toBeFocused();
  await expect(page.locator(`[data-rule-id="${id}"][data-rule-action="review"]`)).toHaveAttribute('aria-pressed','true');
  while(await page.locator('[data-rule-action="remove"]').count()){await tabTo(page,page.locator('[data-rule-action="remove"]').first());await page.keyboard.press('Enter');}
  await expect(page.locator('#pin')).toBeFocused();
  await page.setViewportSize({width:320,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
