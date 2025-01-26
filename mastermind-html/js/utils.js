function shadeColour(color, percent) {
  const num = parseInt(color.replace("#", ""), 16),
    amt = Math.round(2.55 * percent),
    R = (num >> 16) + amt,
    G = ((num >> 8) & 0x00ff) + amt,
    B = (num & 0x0000ff) + amt;

  return `rgb(${Math.min(255, Math.max(0, R))}, ${Math.min(
    255,
    Math.max(0, G),
  )}, ${Math.min(255, Math.max(0, B))})`;
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function hasOverflow(container, onlyX = false, onlyY = false) {
  if (onlyX) {
    return container.scrollWidth > container.clientWidth;
  }
  if (onlyY) {
    return container.scrollHeight > container.clientHeight;
  }
  return (
    container.scrollHeight > container.clientHeight ||
    container.scrollWidth > container.clientWidth
  );
}

class Cookies {
  static setCookie(name, value, days = 365) {
    let d = new Date();
    d.setDate(d.getDate() + days);
    document.cookie = `${name}=${value};expires=${d.toUTCString()};path=/;SameSite=Lax`;
  }

  static getCookie(name) {
    try {
      document;
    } catch {
      return "";
    }
    return (
      document.cookie.match("(^|;)\\s*" + name + "\\s*=\\s*([^;]+)")?.pop() ||
      ""
    );
  }
}

export { shadeColour, randomChoice, hasOverflow, Cookies };
