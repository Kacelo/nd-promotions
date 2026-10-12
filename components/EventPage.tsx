import type { EventRow } from "@/lib/types";
import { formatEventDate, formatMoney, formatTime } from "@/lib/format";
import {
  CalendarIcon,
  ClockIcon,
  Flourish,
  InclusionIcon,
  PinIcon,
} from "./icons";
import RsvpForm from "./RsvpForm";

export default function EventPage({
  event,
  taken,
}: {
  event: EventRow;
  taken: number;
}) {
  const date = formatEventDate(event.event_date) as {
    weekday: string;
    day: string;
  };
  const words = event.name.trim().split(/\s+/);
  const twoLine = words.length === 2;
  const spotsLeft = Math.max(0, event.capacity - taken);
  const open = event.rsvp_open && spotsLeft > 0;
  const time = [formatTime(event.start_time), formatTime(event.end_time)]
    .filter(Boolean)
    .join(" – ");
  const paragraphs = (event.about ?? "")
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  const highlights = (event.about_highlight ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <main>
      <header className="hero">
        <div
          className={`hero-bg${event.hero_image_url ? " has-image" : ""}`}
          style={
            event.hero_image_url
              ? {
                  backgroundImage: `url(${JSON.stringify(
                    event.hero_image_url
                  )})`,
                }
              : undefined
          }
        />
        {event.venue && (
          <div className="hero-place">
            {event.venue.split(",").map((s, i) => (
              <div key={i}>{s.trim()}</div>
            ))}
          </div>
        )}
        <div className="hero-content">
          <div className="wordmark">
            <Flourish className="flourish" />
            <h1
              style={
                twoLine ? undefined : { fontSize: "clamp(48px, 10vw, 110px)" }
              }
            >
              {twoLine
                ? words.map((w) => <span key={w}>{w}</span>)
                : event.name}
            </h1>
          </div>
          {event.tagline && <p className="tagline">{event.tagline}</p>}
          {event.subtitle && <p className="subtitle">{event.subtitle}</p>}
          <div className="infobar">
            <div>
              <CalendarIcon />
              <span>
                {date.weekday}
                <br />
                {date.day}
              </span>
            </div>
            {time && (
              <div>
                <ClockIcon />
                <span>{time}</span>
              </div>
            )}
            {event.venue && (
              <div>
                <PinIcon />
                <span>
                  {event.venue}
                  {event.venue_note && <small>{event.venue_note}</small>}
                </span>
              </div>
            )}
          </div>
          <div>
            <a className="hero-cta" href="#rsvp">
              {open ? "RSVP now" : "RSVPs closed"}
            </a>
          </div>
        </div>
      </header>

      <div className="page">
        <div className="col">
          {(paragraphs.length > 0 || highlights.length > 0) && (
            <section
              className={`card about${
                event.about_image_url ? " with-image" : ""
              }`}
            >
              <div>
                <h2>
                  <span className="small">About</span>
                  {event.name}
                </h2>
                {paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
                {highlights.length > 0 && (
                  <>
                    <div className="rule" />
                    <ul className="highlight">
                      {highlights.map((h, i) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
              {event.about_image_url && (
                <div className="about-img">
                  <img src={event.about_image_url} alt="" />
                </div>
              )}
            </section>
          )}

          <section className="card ticket">
            <div className="price">
              <span className="eyebrow">Ticket</span>
              <strong>{formatMoney(event.price, event.currency)}</strong>
              <span className="eyebrow">Per person</span>
            </div>
            <div className="includes">
              {event.inclusions.length > 0 && (
                <>
                  <span className="eyebrow">
                    What your {formatMoney(event.price, event.currency)}{" "}
                    includes
                  </span>
                  <div className="inc-grid">
                    {event.inclusions.map((item) => (
                      <div className="inc" key={item}>
                        <div className="ic">
                          <InclusionIcon text={item} />
                        </div>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
            {event.package_images.length > 0 && (
              <div className="package">
                {event.package_title && (
                  <span className="eyebrow">{event.package_title}</span>
                )}
                <div
                  className="package-grid"
                  data-count={event.package_images.length}
                >
                  {event.package_images.map((src, i) => (
                    <img
                      src={src}
                      key={src + i}
                      alt={event.package_title ?? "Package"}
                      loading="lazy"
                      style={{ aspectRatio: "1 / 1", borderRadius: "0.5em" }}
                    />
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="card spaces-card">
            {event.spaces_title && <h3>{event.spaces_title}</h3>}
            {event.spaces_text && <p>{event.spaces_text}</p>}
            {(event.spaces_title || event.spaces_text) && <div className="rule" />}
            <strong>
              {open
                ? "Tickets now open"
                : spotsLeft === 0
                ? "Fully booked"
                : "RSVPs closed"}
            </strong>
            <span className="when">
              {[
                formatEventDate(event.event_date, "long-no-weekday"),
                event.venue?.replace(/\.\s*$/, ""),
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </section>

          {(event.dress_code_title || event.dress_code_text) && (
            <section className="card dress">
              <span className="eyebrow">Dress code</span>
              {event.dress_code_title && <h3>{event.dress_code_title}</h3>}
              {event.dress_palette.length > 0 && (
                <div className="swatches">
                  {event.dress_palette.map((c) => (
                    <i key={c} style={{ background: c }} />
                  ))}
                </div>
              )}
              {event.dress_code_text && <p>{event.dress_code_text}</p>}
            </section>
          )}
        </div>

        <div className="col sticky">
          <section className="card" id="rsvp">
            <RsvpForm
              open={open}
              closedByCapacity={spotsLeft === 0}
              event={{
                slug: event.slug,
                name: event.name,
                capacity: event.capacity,
                price: formatMoney(event.price, event.currency),
                payment_method: event.payment_method,
                bank_name: event.bank_name,
                account_name: event.account_name,
                account_number: event.account_number,
                branch_code: event.branch_code,
                payment_reference: event.payment_reference,
                ewallet_number: event.ewallet_number,
                ewallet_name: event.ewallet_name,
                ewallet_providers: event.ewallet_providers,
                custom_question: event.custom_question,
              }}
            />
            <div className="signoff">
              <Flourish />
              {event.subtitle && <p>{event.subtitle}</p>}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
