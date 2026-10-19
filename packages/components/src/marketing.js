/**
 * Marketing primitives — hero, pricing card, feature card, stat card and
 * FAQ, the content shapes every marketing surface needs and the design
 * system never exported.
 *
 * GreenPut's marketing site hand-built roughly 160 blocks in this family
 * (hero, pricing-card, feature-card, stat-card, faq-item) because there
 * was nothing to import; the contracts below (`hero`, `page-hero`,
 * `pricing-card`, `plan-price`, `feature-card`, `stat-value`, `faq-item`)
 * are the ones its templates already use, so the site can adopt these
 * renderers without renaming the hooks its CSS and contract tests are
 * written against.
 *
 * Copy is data on these components — plan names, prices, feature lists,
 * stat values, questions — so text options are escaped. The slots that
 * remain (hero actions and visual, a feature card's icon, an FAQ answer)
 * are markup composition points and are documented as such.
 */
import { escapeAttr, escapeText } from '@basenative/runtime/shared/escape';
import { nextId } from './ids.js';
import { attrsSuffix } from './internal/attrs.js';

/** Check glyph for pricing feature lists, matching the one GreenPut's templates inline. */
const CHECK_ICON =
  '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"/></svg>';

/**
 * Hero — the opening section of a marketing page.
 *
 * Two shapes, matching the ones in production: the default hero (badge,
 * heading, lead, actions, social proof, and an optional visual beside
 * the copy) and the compact page hero (`variant: 'page'`, root contract
 * `page-hero`) that opens interior pages with just a heading and a lead.
 * The section is labelled by its own heading, whose id derives from the
 * hero id.
 *
 * `heading` and `lead` are HTML slots (headings carry <br> and emphasis
 * in practice); `headingText` / `leadText` are the escaped alternatives
 * and win when present, as on renderButton and renderBadge.
 *
 * @param {object} [options]
 * @param {string} [options.badge]  Escaped text in the pill above the heading
 * @param {string} [options.heading]  HTML slot: not escaped; pass trusted markup only
 * @param {string} [options.headingText]  Escaped text; replaces `heading` when present
 * @param {string} [options.lead]  HTML slot: not escaped; pass trusted markup only
 * @param {string} [options.leadText]  Escaped text; replaces `lead` when present
 * @param {string} [options.actions]  HTML slot (typically button-styled anchors): not escaped
 * @param {string} [options.proof]  Escaped text (the social-proof line under the actions)
 * @param {string} [options.visual]  HTML slot beside the copy: not escaped
 * @param {'default'|'page'} [options.variant='default']
 * @param {string} [options.id]  Defaults to nextId('hero'); the heading id derives from it
 * @param {string} [options.attrs]  Raw attribute markup appended to the <section>; not escaped
 * @returns {string}
 */
export function renderHero(options = {}) {
  const {
    badge = '',
    heading = '',
    headingText,
    lead = '',
    leadText,
    actions = '',
    proof = '',
    visual = '',
    variant = 'default',
    id = nextId('hero'),
    attrs = '',
  } = options;

  const headingHtml = headingText != null ? escapeText(headingText) : heading;
  const leadHtml = leadText != null ? escapeText(leadText) : lead;
  const headingId = `${id}-heading`;
  const leadBlock = leadHtml ? `<p data-bn="lead">${leadHtml}</p>` : '';

  if (variant === 'page') {
    return `<section data-bn="page-hero" id="${escapeAttr(id)}" aria-labelledby="${escapeAttr(headingId)}"${attrsSuffix(attrs)}>
  <div data-bn="container">
    <h1 id="${escapeAttr(headingId)}">${headingHtml}</h1>
    ${leadBlock}
  </div>
</section>`;
  }

  const badgeBlock = badge ? `<p data-bn="hero-badge"><span>${escapeText(badge)}</span></p>` : '';
  const actionsBlock = actions ? `<div data-bn="hero-actions">${actions}</div>` : '';
  const proofBlock = proof ? `<p data-bn="hero-social-proof">${escapeText(proof)}</p>` : '';
  const visualBlock = visual ? `<div data-bn="hero-visual">${visual}</div>` : '';

  return `<section data-bn="hero" id="${escapeAttr(id)}" aria-labelledby="${escapeAttr(headingId)}"${attrsSuffix(attrs)}>
  <div data-bn="container">
    <div data-bn="hero-content">
      ${badgeBlock}
      <h1 id="${escapeAttr(headingId)}">${headingHtml}</h1>
      ${leadBlock}
      ${actionsBlock}
      ${proofBlock}
    </div>
    ${visualBlock}
  </div>
</section>`;
}

/**
 * The pricing card body, shared by renderPricingCard (an <article>) and
 * renderPricingCards (an <li> per plan) so the two roots cannot drift.
 *
 * @param {object} options  See renderPricingCard
 * @param {'article'|'li'} tag
 * @returns {string}
 */
function pricingCardHtml(options, tag) {
  const {
    name,
    badge = '',
    priceLabel,
    priceNote = '',
    tagline = '',
    features = [],
    featured = false,
    cta,
    attrs = '',
  } = options;

  const featuredAttr = featured ? ' data-featured=""' : '';
  const badgeBlock = badge ? `<p data-bn="plan-badge">${escapeText(badge)}</p>` : '';
  const noteBlock = priceNote
    ? ` <span data-bn="plan-price-note">${escapeText(priceNote)}</span>`
    : '';
  const taglineBlock = tagline ? `<p data-bn="plan-tagline">${escapeText(tagline)}</p>` : '';
  const featuresBlock = features.length
    ? `<ul data-bn="plan-features">${features.map((feature) => `<li>${CHECK_ICON}${escapeText(feature)}</li>`).join('')}</ul>`
    : '';
  const ctaBlock = cta
    ? `<a href="${escapeAttr(cta.href)}" data-bn="button" data-variant="${escapeAttr(cta.variant ?? (featured ? 'primary' : 'ghost'))}" data-full>${escapeText(cta.label)}</a>`
    : '';

  return `<${tag} data-bn="pricing-card"${featuredAttr}${attrsSuffix(attrs)}>
  ${badgeBlock}
  <h3>${escapeText(name ?? '')}</h3>
  <p data-bn="plan-price"><strong>${escapeText(priceLabel ?? '')}</strong>${noteBlock}</p>
  ${taglineBlock}
  ${featuresBlock}
  ${ctaBlock}
</${tag}>`;
}

/**
 * Pricing card — one plan: optional badge, name, price, tagline, a
 * check-marked feature list and a call to action. A `featured` plan is
 * stamped data-featured and its CTA defaults to the primary variant
 * (ghost otherwise), matching the emphasis pattern in production.
 *
 * All copy (name, badge, priceLabel, priceNote, tagline, features, the
 * CTA label) is escaped text; the CTA href is an escaped attribute.
 *
 * @param {object} [options]
 * @param {string} [options.name]
 * @param {string} [options.badge]
 * @param {string} [options.priceLabel]
 * @param {string} [options.priceNote]  Rendered after the price (e.g. a per-period note)
 * @param {string} [options.tagline]
 * @param {string[]} [options.features]
 * @param {boolean} [options.featured]
 * @param {{label: string, href: string, variant?: string}} [options.cta]
 * @param {string} [options.attrs]  Raw attribute markup appended to the <article>; not escaped
 * @returns {string}
 */
export function renderPricingCard(options = {}) {
  return pricingCardHtml(options, 'article');
}

/**
 * The pricing card list: a <ul data-bn="pricing-cards"> with one
 * <li data-bn="pricing-card"> per plan — the exact shape GreenPut's
 * pricing sections iterate. Takes the same per-plan options as
 * renderPricingCard.
 *
 * @param {object} [options]
 * @param {Array<object>} [options.plans]  renderPricingCard option objects
 * @param {string} [options.attrs]  Raw attribute markup appended to the <ul>; not escaped
 * @returns {string}
 */
export function renderPricingCards(options = {}) {
  const { plans = [], attrs = '' } = options;
  return `<ul data-bn="pricing-cards"${attrsSuffix(attrs)}>${plans.map((plan) => pricingCardHtml(plan, 'li')).join('')}</ul>`;
}

/**
 * Feature card — icon, optional tag, title and description, for feature
 * grids. The icon is a markup slot (an SVG); the title and description
 * are escaped text, with `body` as the HTML-slot alternative for
 * descriptions that need markup.
 *
 * @param {object} [options]
 * @param {string} [options.icon]  HTML slot inside the icon frame: not escaped
 * @param {string} [options.tag]  Escaped text above the title
 * @param {string} [options.title]  Escaped text
 * @param {string} [options.text]  Escaped text description
 * @param {string} [options.body]  HTML slot replacing the text paragraph: not escaped
 * @param {string} [options.attrs]  Raw attribute markup appended to the <article>; not escaped
 * @returns {string}
 */
export function renderFeatureCard(options = {}) {
  const { icon = '', tag = '', title, text, body = '', attrs = '' } = options;

  const iconBlock = icon ? `<div data-bn="feature-icon" aria-hidden="true">${icon}</div>` : '';
  const tagBlock = tag ? `<p data-bn="feature-tag">${escapeText(tag)}</p>` : '';
  const bodyBlock = body ? body : `<p>${escapeText(text ?? '')}</p>`;

  return `<article data-bn="feature-card"${attrsSuffix(attrs)}>
  ${iconBlock}
  ${tagBlock}
  <h3>${escapeText(title ?? '')}</h3>
  ${bodyBlock}
</article>`;
}

/**
 * Stat card — a value, its label, and an optional trend indicator, in
 * the shape dashboards and marketing proof sections share.
 *
 * @param {object} [options]
 * @param {string} [options.value]  Escaped text
 * @param {string} [options.label]  Escaped text
 * @param {string} [options.trendText]  Escaped text (e.g. "+12%"); renders the trend span when present
 * @param {'up'|'down'} [options.trend='up']  Stamps data-trend on the trend span
 * @param {string} [options.attrs]  Raw attribute markup appended to the wrapper; not escaped
 * @returns {string}
 */
export function renderStatCard(options = {}) {
  const { value, label, trendText = '', trend = 'up', attrs = '' } = options;

  const trendBlock = trendText
    ? `<span data-bn="stat-growth" data-trend="${escapeAttr(trend)}">${escapeText(trendText)}</span>`
    : '';

  return `<div data-bn="stat-card"${attrsSuffix(attrs)}>
  <span data-bn="stat-value">${escapeText(value ?? '')}</span>
  <span data-bn="stat-label">${escapeText(label ?? '')}</span>
  ${trendBlock}
</div>`;
}

/**
 * One FAQ entry: a question and its answer as a definition-list pair
 * inside the faq-item wrapper — the shape GreenPut's FAQ sections use,
 * valid inside renderFaq's <dl>. The question is escaped text; the
 * answer is an HTML slot (answers carry links and emphasis), with
 * `answerText` as the escaped alternative that wins when present.
 *
 * @param {object} [options]
 * @param {string} [options.question]  Escaped text
 * @param {string} [options.answer]  HTML slot: not escaped; pass trusted markup only
 * @param {string} [options.answerText]  Escaped text; replaces `answer` when present
 * @param {string} [options.attrs]  Raw attribute markup appended to the wrapper; not escaped
 * @returns {string}
 */
export function renderFaqItem(options = {}) {
  const { question, answer = '', answerText, attrs = '' } = options;
  const slot = answerText != null ? escapeText(answerText) : answer;
  return `<div data-bn="faq-item"${attrsSuffix(attrs)}><dt>${escapeText(question ?? '')}</dt><dd>${slot}</dd></div>`;
}

/**
 * FAQ list — a <dl data-bn="faq-list"> of renderFaqItem entries.
 *
 * @param {object} [options]
 * @param {Array<{question: string, answer?: string, answerText?: string}>} [options.items]
 * @param {string} [options.attrs]  Raw attribute markup appended to the <dl>; not escaped
 * @returns {string}
 */
export function renderFaq(options = {}) {
  const { items = [], attrs = '' } = options;
  return `<dl data-bn="faq-list"${attrsSuffix(attrs)}>${items.map((item) => renderFaqItem(item)).join('')}</dl>`;
}
