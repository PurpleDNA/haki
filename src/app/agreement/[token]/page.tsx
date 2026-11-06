import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { formatDate, formatDateTimeLagos } from '@/domain/dates';
import { naira } from '@/domain/money';
import { instalmentAmounts, salePrice } from '@/domain/pricing';
import { db } from '@/server/db';
import { loadAgreement } from '@/server/financings';
import { getSettings } from '@/server/settings';
import { SignForm } from './SignForm';

export const metadata: Metadata = { title: 'Your agreement' };
export const dynamic = 'force-dynamic';

export default async function AgreementPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const a = await loadAgreement(db(), token);
  if (!a) notFound();
  const settings = await getSettings(db());
  const { record: f, terms, schedule } = a;
  const first = f.applicant.fullName.split(' ')[0];
  const sale = naira(salePrice(terms));
  const pdfHref = `/agreement/${token}/pdf`;

  if (a.accepted) {
    const next = schedule[0];
    return (
      <div className="center">
        <div className="cardbox mid">
          <img src="/haki-logo.svg" alt="Haki" />
          <h1>Agreement accepted</h1>
          <p>You accepted on {formatDateTimeLagos(f.accepted_at!)}. {next.number === 0
            ? `Your down payment of ${naira(next.amountKobo)} is due now, and we’ll buy your item once it’s received.`
            : `Your first payment of ${naira(next.amountKobo)} is due on ${formatDate(next.dueOn)}.`}</p>
          <a className="btn pri" href={pdfHref}>Download your copy (PDF)</a>
        </div>
      </div>
    );
  }

  return (
    <div className="agr">
      <header className="ahead">
        <div className="wrap">
          <div className="bar1"><span className="logo-tile"><img src="/haki-logo.svg" alt="Haki" /></span><span>Ref {f.reference}</span></div>
          <h1>Your Murabaha agreement</h1>
          <p>Hi {first}, here’s everything we agreed. Please read it, then accept at the bottom.</p>
        </div>
      </header>
      <div className="wrap">
        <div className="doc">
          <section className="sec">
            <h2>What we’re buying for you</h2>
            <b style={{ fontSize: 16 }}>{f.description}</b>
            <div className="muted" style={{ marginTop: 2 }}>From {f.vendor_name}</div>
            <p className="ink2" style={{ margin: '14px 0 0', lineHeight: 1.6 }}>Haki buys this from the vendor. Once you accept, you pay us the price below.</p>
          </section>
          <section className="sec">
            <h2>The price</h2>
            <div className="price">
              <div><div className="l">What we pay the vendor</div><div className="v num">{naira(terms.costKobo)}</div></div>
              <span className="op">+</span>
              <div><div className="l">Our profit</div><div className="v num">{naira(terms.profitKobo)}</div></div>
              <span className="op">=</span>
              <div className="sale"><div className="l">Your price</div><div className="v num">{sale}</div></div>
            </div>
            <div className="fixed">This price is fixed. It will never go up, even if a payment is late.</div>
            <div className="split">
              <div><span className="ink2">Down payment</span><b>{naira(terms.downKobo)}</b></div>
              <div><span className="ink2">Then {terms.tenor} monthly payments of</span><b>{naira(instalmentAmounts(terms)[0])}</b></div>
            </div>
          </section>
          <section className="sec">
            <h2>Your payment dates</h2>
            <div className="sch">
              {schedule.map((s) => <div key={s.number}><span>{s.number === 0 ? 'Down payment, on acceptance' : formatDate(s.dueOn)}</span><b className="num">{naira(s.amountKobo)}</b></div>)}
            </div>
            <p className="fine">These dates assume you accept today. They’re fixed once you accept.</p>
          </section>
          <section className="sec">
            <h2>The agreement</h2>
            <pre className="agtext" style={{ fontFamily: 'inherit' }}>{f.agreement_text}</pre>
            <p style={{ marginTop: 12 }}><a className="link" href={pdfHref}>Download as PDF</a></p>
          </section>
          <section className="sec">
            <h2>Accept</h2>
            <SignForm token={token} sale={sale} support={settings.phone ?? settings.email} />
          </section>
        </div>
        <div style={{ height: 60 }} />
      </div>
    </div>
  );
}
