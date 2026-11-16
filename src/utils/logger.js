// 상세 진행 로그는 개발 서버에서만 출력하고, 배포 사이트 콘솔에는 예상 밖 오류만 남김
const isDev = Boolean(import.meta.env?.DEV);

export const debugLog = (...args) => {
  if (isDev) console.log(...args);
};

export const debugWarn = (...args) => {
  if (isDev) console.warn(...args);
};
