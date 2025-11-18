function humanDelay(min = 1000, max = 3000) {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
}

async function randomScroll(page) {
  const scrollSteps = Math.floor(Math.random() * 5) + 3;
  
  for (let i = 0; i < scrollSteps; i++) {
    const scrollAmount = Math.floor(Math.random() * 500) + 200;
    const scrollDelay = Math.floor(Math.random() * 1000) + 500;
    
    await page.evaluate((amount) => {
      window.scrollBy({
        top: amount,
        behavior: 'smooth'
      });
    }, scrollAmount);
    
    await humanDelay(scrollDelay - 200, scrollDelay + 200);
    
    // Sometimes scroll up a bit
    if (Math.random() > 0.7) {
      const scrollBack = Math.floor(Math.random() * 200) + 50;
      await page.evaluate((amount) => {
        window.scrollBy({
          top: -amount,
          behavior: 'smooth'
        });
      }, scrollBack);
      
      await humanDelay(300, 800);
    }
  }
}

async function humanMove(page, selector) {
  const element = await page.$(selector);
  const box = await element.boundingBox();
  
  if (!box) {
    throw new Error('Element not visible');
  }

  // Create curved mouse movement
  const steps = 10;
  const startX = Math.random() * 100 + 50;
  const startY = Math.random() * 100 + 50;
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    
    // Bezier curve for natural movement
    const x = startX + (box.x + box.width / 2 - startX) * t;
    const y = startY + (box.y + box.height / 2 - startY) * t + Math.sin(t * Math.PI) * 20;
    
    await page.mouse.move(x, y);
    await humanDelay(30, 80);
  }
}

module.exports = {
  humanDelay,
  randomScroll,
  humanMove
};