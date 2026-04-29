export const getHardwareId = (): string => {
  if (!import.meta.client) return "";

  let hwid = localStorage.getItem("mc_device_hwid");
  if (!hwid) {
    hwid = crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem("mc_device_hwid", hwid);
  }
  return hwid;
};
