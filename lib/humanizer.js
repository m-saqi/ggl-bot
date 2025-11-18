function humanDelay(min = 1000, max = 3000) {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
}

async function randomScroll(page) {
  const scrollSteps = Math.floor(Math.random() * 4) + 2;
  
  for (let i = 0; i < scrollSteps; i++) {
    const scrollAmount = Math.floor(Math.random() * 400) + 150;
    const scrollDelay = Math.floor(Math.random() * 800) + 400;
    
    await page.evaluate((amount) => {
      window.scrollBy({
        top: amount,
        behavior: 'smooth'
      });
    }, scrollAmount);
    
    await humanDelay(scrollDelay - 200, scrollDelay + 200);
    
    // Sometimes scroll up a bit (human behavior)
    if (Math.random() > 0.8) {
      const scrollBack = Math.floor(Math.random() * 150) + 30;
      await page.evaluate((amount) => {
        window.scrollBy({
          top: -amount,
          behavior: 'smooth'
        });
      }, scrollBack);
      
      await humanDelay(300, 600);
    }
  }
}

async function humanMove(page, selector) {
  const element = await page.$(selector);
  if (!element) throw new Error('Element not found');
  
  const box = await element.boundingBox();
  if (!box) throw new Error('Element not visible');

  const steps = 6;
  const startX = Math.random() * 100 + 50;
  const startY = Math.random() * 100 + 50;
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = startX + (box.x + box.width / 2 - startX) * t;
    const y = startY + (box.y + box.height / 2 - startY) * t + Math.sin(t * Math.PI) * 10;
    
    await page.mouse.move(x, y);
    await humanDelay(50, 120);
  }
}

module.exports = {
  humanDelay,
  randomScroll,
  humanMove
};
