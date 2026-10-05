export const getBatteryWarnings = (battery) => {
  const warnings = [];

  if (!battery) {
    return warnings;
  }

  const temperature = Number(battery.temperature);
  const soc = Number(battery.soc);
  const current = Number(battery.current);

  const soh =
    battery.soh !== undefined && battery.soh !== null
      ? Number(battery.soh)
      : null;

  // =========================================
  // TEMPERATURE WARNINGS
  // =========================================

  if (!Number.isNaN(temperature)) {
    if (temperature >= 50) {
      warnings.push({
        type: "danger",
        title: "High Battery Temperature",
        message: "Battery temperature is very high.",
      });
    } else if (temperature >= 45) {
      warnings.push({
        type: "warning",
        title: "Battery Temperature Warning",
        message: "Battery temperature is higher than normal.",
      });
    }
  }

  // =========================================
  // LOW SOC WARNINGS
  // =========================================

  if (!Number.isNaN(soc)) {
    if (soc <= 10) {
      warnings.push({
        type: "danger",
        title: "Critically Low Battery",
        message: "State of charge is critically low.",
      });
    } else if (soc <= 20) {
      warnings.push({
        type: "warning",
        title: "Low Battery",
        message: "State of charge is low.",
      });
    }
  }

  // =========================================
  // HIGH CURRENT WARNING
  // =========================================

  if (!Number.isNaN(current) && Math.abs(current) >= 5) {
    warnings.push({
      type: "warning",
      title: "High Current Flow",
      message: "Battery current is unusually high.",
    });
  }

  // =========================================
  // SOH WARNING
  // =========================================

  if (soh !== null && !Number.isNaN(soh)) {
    const sohPercent = soh <= 1 ? soh * 100 : soh;

    if (sohPercent <= 60) {
      warnings.push({
        type: "danger",
        title: "Poor Battery Health",
        message: "AI-estimated battery health is very low.",
      });
    } else if (sohPercent <= 80) {
      warnings.push({
        type: "warning",
        title: "Battery Health Warning",
        message: "AI-estimated battery health has decreased.",
      });
    }
  }

  return warnings;
};
