import { Link } from 'react-router-dom';

// A full-width promotional banner an owner can run in the PLP. Left side is
// the promotional content (image + text) the owner wrote; right side is the
// turf's own details (image, description, discount) pulled automatically so
// it always reflects the real listing, not stale copy-pasted info.
export default function CampaignBanner({ campaign }) {
  return (
    <Link to={`/turfs/${campaign.turf_id}`} className="campaign-banner">
      <div className="campaign-banner-promo">
        {campaign.promo_image && (
          <img src={campaign.promo_image} alt="" className="campaign-banner-promo-image" onError={(e) => { e.target.style.display = 'none'; }} />
        )}
        <p className="campaign-banner-promo-text">{campaign.promo_text}</p>
      </div>
      <div className="campaign-banner-turf">
        {campaign.turf_cover_image && (
          <img src={campaign.turf_cover_image} alt={campaign.turf_name} className="campaign-banner-turf-image" onError={(e) => { e.target.style.display = 'none'; }} />
        )}
        <div>
          <h3>{campaign.turf_name}</h3>
          <p className="subtle small">{campaign.turf_city}</p>
          {campaign.turf_description && <p className="subtle small">{campaign.turf_description}</p>}
          <p className="price">
            {campaign.old_price ? <span className="old-price">₹{campaign.old_price}</span> : null}
            ₹{campaign.rate_per_hour}/hr
          </p>
        </div>
      </div>
    </Link>
  );
}
