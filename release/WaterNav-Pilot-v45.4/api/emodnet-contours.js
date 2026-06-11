const WFS='https://ows.emodnet-bathymetry.eu/wfs';
const TYPE_NAMES=['emodnet:contours','contours'];
module.exports=async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Cache-Control','s-maxage=3600, stale-while-revalidate=86400');
  const bbox=String(req.query.bbox||'11.68,55.88,11.93,56.05').split(',').map(Number);
  if(bbox.length!==4||bbox.some(n=>!Number.isFinite(n))) return res.status(400).send('Invalid bbox');
  // Limit area to avoid huge WFS requests
  if(Math.abs(bbox[2]-bbox[0])>1.2||Math.abs(bbox[3]-bbox[1])>1.2) return res.status(400).send('BBOX too large');
  let lastErr='';
  for(const typeName of TYPE_NAMES){
    const url=`${WFS}?service=WFS&version=1.0.0&request=GetFeature&typeName=${encodeURIComponent(typeName)}&BBOX=${bbox.join(',')}&format=application/json&srsName=EPSG:4326`;
    try{
      const r=await fetch(url,{headers:{'Accept':'application/json, text/xml;q=0.8'}});
      const text=await r.text();
      if(!r.ok){lastErr=`${typeName}: HTTP ${r.status}`;continue;}
      if(text.trim().startsWith('{')){res.setHeader('Content-Type','application/json');return res.status(200).send(text);}
      // Some WFS responses ignore format and return GML/XML; return a clean error rather than broken JSON.
      lastErr=`${typeName}: WFS returned XML/GML, not GeoJSON`;
    }catch(e){lastErr=String(e.message||e);}
  }
  return res.status(502).json({type:'FeatureCollection',features:[],error:lastErr||'EMODnet WFS failed'});
}
