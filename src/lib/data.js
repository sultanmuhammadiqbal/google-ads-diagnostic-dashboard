// Memuat JSON statis dari public/data dan mengubahnya menjadi baris objek.

export async function loadData() {
  const base = import.meta.env.BASE_URL;
  const get = async (name) => {
    const res = await fetch(`${base}data/${name}.json`);
    if (!res.ok) throw new Error(`Gagal memuat ${name}.json (${res.status})`);
    return res.json();
  };
  const [meta, daily, decisions] = await Promise.all([get('meta'), get('daily'), get('decisions')]);

  const col = Object.fromEntries(daily.columns.map((c, i) => [c, i]));
  const convIds = meta.conversionTypes.map((t) => t.id);
  const rows = daily.rows.map((r) => {
    const campaign = meta.campaigns[r[col.c]];
    const row = {
      day: r[col.d],
      campaign: campaign.id,
      type: campaign.type,
      device: meta.devices[r[col.v]].id,
      cost: r[col.cost],
      clicks: r[col.clicks],
      impressions: r[col.impressions],
    };
    let all = 0;
    for (const id of convIds) {
      row[id] = r[col[id]];
      all += r[col[id]];
    }
    row.allConv = all;
    return row;
  });
  return { meta, rows, decisions };
}
