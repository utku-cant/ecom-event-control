const ACCESS_TOKEN = 'BURAYA_TOKEN';
const EMAIL_RECEIVER = 'mail_adresinizi_buraya_girin@gmail.com';

const MONITORED_ACTIONS = {
  'offsite_conversion.fb_pixel_purchase': 'Purchase',
  'offsite_conversion.fb_pixel_initiate_checkout': 'BeginCheckout',
  'offsite_conversion.fb_pixel_add_to_cart': 'AddToCart'
};

function checkAdAccountConversions() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("AdAccounts");
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const idx = {
    accountName: headers.indexOf("Account Name"),
    adAccountId: headers.indexOf("Ad Account ID")
  };

  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const dayBefore = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000);
  const sinceYesterday = Utilities.formatDate(yesterday, "GMT", "yyyy-MM-dd");
  const sinceDayBefore = Utilities.formatDate(dayBefore, "GMT", "yyyy-MM-dd");

  let htmlBody = `
  <div style="font-family: Arial, sans-serif; font-size: 14px; color: #333;">
    <p style="margin-bottom: 16px;">
      Herkese selamlar, düne ait eventlerin bir önceki gün ile değişimi kıyaslanarak oluşturulmuş bir rapordur.
    </p>
    <h2 style="color: #3b5998;">📊 Düne Ait Eventler (${sinceYesterday}) – % Değişim</h2>
  `;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const accountName = row[idx.accountName];
    const adAccountId = row[idx.adAccountId].replace("act_", "");

    const countsToday = getActionCounts(adAccountId, sinceYesterday, sinceYesterday);
    const countsPrev = getActionCounts(adAccountId, sinceDayBefore, sinceDayBefore);

    if (!countsToday || !countsPrev) continue;

    const changes = {};
    const changeColors = {};

    for (let key in countsToday) {
      const todayVal = countsToday[key];
      const prevVal = countsPrev[key];
      let diff = 0;
      if (prevVal === 0 && todayVal > 0) {
        diff = 100;
      } else if (prevVal === 0 && todayVal === 0) {
        diff = 0;
      } else {
        diff = ((todayVal - prevVal) / prevVal) * 100;
      }

      const isPositive = diff > 0;
      const absDiff = Math.abs(diff);
      let color = "#000";

      if (absDiff === 0) {
        color = "#888"; // gri - sabit
      } else if (isPositive) {
        if (absDiff < 25) color = "#a8e6a2";
        else if (absDiff < 50) color = "#66c666";
        else color = "#2e7d32";
      } else {
        if (absDiff < 25) color = "#f4aaaa";
        else if (absDiff < 50) color = "#ec5c5c";
        else color = "#c62828";
      }

      const sign = diff > 0 ? "+" : diff < 0 ? "−" : "";
      changes[key] = `${sign}${Math.abs(diff).toFixed(1)}%`;
      changeColors[key] = color;
    }

    const missingEvents = Object.entries(countsToday)
      .filter(([_, val]) => val === 0)
      .map(([key]) => key);

    const accountNameColor = missingEvents.length > 0 ? '#d93025' : '#444';

    htmlBody += `
      <div style="margin-bottom: 30px; border: 1px solid #ddd; border-radius: 10px; padding: 16px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
        <h3 style="margin-top: 0; color: ${accountNameColor};">📌 ${accountName}</h3>

        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <thead>
            <tr style="background-color: #f6f6f6;">
              <th style="border: 1px solid #ccc; padding: 8px;">Event</th>
              <th style="border: 1px solid #ccc; padding: 8px; text-align: center;">Adet</th>
              <th style="border: 1px solid #ccc; padding: 8px; text-align: center;">% Değişim</th>
            </tr>
          </thead>
          <tbody>`;

    for (let key in countsToday) {
      htmlBody += `
        <tr>
          <td style="border: 1px solid #eee; padding: 8px;">${key}</td>
          <td style="border: 1px solid #eee; padding: 8px; text-align: center;">${countsToday[key]}</td>
          <td style="border: 1px solid #eee; padding: 8px; text-align: center; color: ${changeColors[key]}; font-weight: bold;">
            ${changes[key]}
          </td>
        </tr>`;
    }

    htmlBody += `
          </tbody>
        </table>
        <div style="margin-top: 10px;">`;

    if (missingEvents.length > 0) {
      htmlBody += `<span style="color: #d93025; font-weight: bold;">⚠️ Eksik eventler:</span> ${missingEvents.join(', ')}`;
    } else {
      htmlBody += `<span style="color: #188038; font-weight: bold;">✅ Tüm eventler gerçekleşti.</span>`;
    }

    htmlBody += `</div></div>`;
  }

  htmlBody += `
    <p style="font-size: 12px; color: #888; text-align: center; margin-top: 40px;">
      Bu rapor Meta API ile otomatik oluşturulmuştur.
    </p>
  </div>`;

  MailApp.sendEmail({
    to: EMAIL_RECEIVER,
    subject: `Meta | E-Ticaret Event Kontrol Raporu | ${sinceYesterday} | [Meta Script] [Pod2]`,
    htmlBody: htmlBody
  });
}

function getActionCounts(adAccountId, since, until) {
  const url = `https://graph.facebook.com/v19.0/act_${adAccountId}/insights?fields=actions&time_range[since]=${since}&time_range[until]=${until}&access_token=${ACCESS_TOKEN}`;

  try {
    const response = UrlFetchApp.fetch(url);
    const result = JSON.parse(response.getContentText());
    const actions = result.data?.[0]?.actions || [];
    const counts = {};

    for (let key in MONITORED_ACTIONS) {
      counts[MONITORED_ACTIONS[key]] = 0;
    }

    actions.forEach(action => {
      const readable = MONITORED_ACTIONS[action.action_type];
      if (readable) {
        counts[readable] = parseInt(action.value);
      }
    });

    return counts;

  } catch (err) {
    Logger.log(`❌ ${adAccountId} için veri alınamadı: ${err.message}`);
    return null;
  }
}
