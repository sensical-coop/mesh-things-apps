/**
 * The terms owners accept, as the API serves them: the account terms at signup, the mesh
 * terms per mesh on the default broker, the source terms per source and the sink terms per
 * sink (copied, not served yet: the mock has no sinks). A copy of
 * meshtastic-things `registry/terms.py`, word for word, and kept in step with it. The
 * console shows what these routes return and keeps no copy of its own.
 */
export type TermsKind = "account" | "mesh" | "source" | "sink";
export type TermsLocale = "en" | "es";

export const TERMS_VERSIONS: Record<TermsKind, string> = {
  account: "account-2026-09",
  mesh: "meshes-2026-09",
  source: "sources-2026-09",
  sink: "sinks-2026-09",
};

// Mirrors REGISTRY__DATA_RETENTION_DAYS (blank for none), REGISTRY__DATA_DELETION_GRACE_DAYS
// and REGISTRY__TERMS_RENEWAL_NOTICE_DAYS. Set here so the mock exercises renewals.
/**
 * Mirrors REGISTRY__TERMS_ENFORCED (on unless "false"). Off, as on a self-hosted lite
 * install: every terms route answers 404, no terms are needed or recorded, and the
 * retention period is ignored, so nothing lapses.
 */
export const TERMS_ENFORCED = process.env.MOCK_TERMS_ENFORCED !== "false";

export const DATA_RETENTION_DAYS: number | null =
  !TERMS_ENFORCED || process.env.MOCK_DATA_RETENTION_DAYS === ""
    ? null
    : Number(process.env.MOCK_DATA_RETENTION_DAYS ?? 365);
export const DATA_DELETION_GRACE_DAYS = 30;
export const TERMS_RENEWAL_NOTICE_DAYS = 30;

/** Mirrors `dpa_url()`: the Data Processing Agreement page, under REGISTRY__PUBLIC_FRONTEND_URL. */
const DPA_URL = `${(process.env.MOCK_PUBLIC_FRONTEND_URL ?? "http://localhost:5173").replace(/\/$/, "")}/dpa`;

type Copy = {
  title: string;
  description: string;
  statements: { id: string; text: string }[];
  footnote: string;
};

/** Data terms also state how long data is kept; the account terms store none. */
type DataCopy = Copy & {
  retention_limited: string;
  retention_unlimited: string;
};

const COPY: { account: Record<TermsLocale, Copy> } & Record<
  "mesh" | "source" | "sink",
  Record<TermsLocale, DataCopy>
> = {
  account: {
    en: {
      title: "Before you create your account",
      description:
        "Your account lets you sign in, explore public meshes and manage your profile. It stores only your name, email address and settings. Creating a mesh, which stores data from its devices, asks you to accept its own terms at that point.",
      statements: [
        {
          id: "terms",
          text: "I accept the Mesh Things Terms of Use.",
        },
        {
          id: "privacy",
          text: "I've read the Privacy Policy, which explains how my name and email address are used.",
        },
      ],
      footnote:
        "You can delete your account at any time from your profile. Questions or data requests: info@sensical.es.",
    },
    es: {
      title: "Antes de crear tu cuenta",
      description:
        "Tu cuenta te permite iniciar sesión, explorar mallas públicas y gestionar tu perfil. Solo guarda tu nombre, tu correo y tus ajustes. Crear una malla, que guarda los datos de sus dispositivos, te pide aceptar sus propias condiciones en ese momento.",
      statements: [
        {
          id: "terms",
          text: "Acepto las Condiciones de uso de Mesh Things.",
        },
        {
          id: "privacy",
          text: "He leído la Política de privacidad, que explica cómo se usan mi nombre y mi correo.",
        },
      ],
      footnote:
        "Puedes eliminar tu cuenta cuando quieras desde tu perfil. Dudas o solicitudes sobre datos: info@sensical.es.",
    },
  },
  mesh: {
    en: {
      title: "Before you create a mesh",
      description:
        "A mesh stores the traffic its gateways send to the default broker. That traffic can include personal data from people who never signed up here: node names, device IDs, positions and telemetry. For this mesh you decide what is collected and why, and Sensical processes it only on your behalf to run the service. Tick each box to continue.",
      statements: [
        {
          id: "controller",
          text: "I act as data controller for the traffic this mesh brings in. I authorise Sensical to ingest, decode and store it on my behalf as a processor, under the Data Processing Agreement ({dpa_url}). If I'm an operator, this includes keeping the devices I choose in a long-term archive that I can download.",
        },
        {
          id: "lawfulBasis",
          text: "I have a lawful basis for this processing, such as legitimate interest, and I tell the people whose nodes appear on this mesh how their data is used.",
        },
        {
          id: "minimisation",
          text: "I'll store only what this mesh needs: I'll register only its own gateways and, if I archive devices, only those I need and only while I need them.",
        },
        {
          id: "sensitive",
          text: "I won't use this mesh to collect sensitive data, such as health information, or to track or profile individuals.",
        },
      ],
      footnote:
        "You can withdraw at any time by deleting the mesh. Questions or data requests: info@sensical.es.",
      retention_limited:
        "This acceptance is valid for {days} days. We'll email you before it lapses so you can renew it. If you don't, the mesh stops storing new data, and the data it stored, including any archive, is deleted {grace} days later unless you renew in the meantime.",
      retention_unlimited:
        "The mesh's data is kept while the mesh is in use. When you delete it, its data, including any archive, is deleted {grace} days later.",
    },
    es: {
      title: "Antes de crear una malla",
      description:
        "Una malla guarda el tráfico que sus pasarelas envían al bróker por defecto. Ese tráfico puede incluir datos personales de personas que nunca se han registrado aquí: nombres de nodo, identificadores de dispositivo, posiciones y telemetría. En esta malla tú decides qué se recoge y para qué, y Sensical lo trata solo por tu cuenta para prestar el servicio. Marca cada casilla para continuar.",
      statements: [
        {
          id: "controller",
          text: "Actúo como responsable del tratamiento del tráfico que trae esta malla. Autorizo a Sensical a recibirlo, descifrarlo y almacenarlo por mi cuenta como encargado del tratamiento, según el Acuerdo de procesamiento de los datos ({dpa_url}). Si soy operador, esto incluye conservar los dispositivos que elija en un archivo a largo plazo que puedo descargar.",
        },
        {
          id: "lawfulBasis",
          text: "Tengo una base jurídica para este tratamiento, como el interés legítimo, e informo a las personas cuyos nodos aparecen en esta malla de cómo se usan sus datos.",
        },
        {
          id: "minimisation",
          text: "Guardaré solo lo que esta malla necesite: registraré solo sus propias pasarelas y, si archivo dispositivos, solo los que necesite y solo mientras los necesite.",
        },
        {
          id: "sensitive",
          text: "No usaré esta malla para recoger datos sensibles, como información de salud, ni para seguir o perfilar a personas.",
        },
      ],
      footnote:
        "Puedes retirarte cuando quieras eliminando la malla. Dudas o solicitudes sobre datos: info@sensical.es.",
      retention_limited:
        "Esta aceptación es válida durante {days} días. Te avisaremos por correo antes de que caduque para que puedas renovarla. Si no lo haces, la malla deja de guardar datos nuevos, y los datos guardados, incluido cualquier archivo, se borran {grace} días después salvo que renueves antes.",
      retention_unlimited:
        "Los datos de la malla se conservan mientras la malla esté en uso. Cuando la eliminas, sus datos, incluido cualquier archivo, se borran {grace} días después.",
    },
  },
  source: {
    en: {
      title: "Before you connect a source",
      description:
        "A source bridges traffic from a broker you choose into Mesh Things. That traffic can include personal data from people who never signed up here: node names, device IDs, positions and telemetry. For this traffic you decide what is collected and why, and Sensical processes it only on your behalf to run the service. Tick each box to continue.",
      statements: [
        {
          id: "controller",
          text: "I act as data controller for the traffic this source brings in. I authorise Sensical to ingest, decode and store it on my behalf as a processor, under the Data Processing Agreement ({dpa_url}). This includes keeping the devices I choose in a long-term archive that I can download.",
        },
        {
          id: "authority",
          text: "I'm authorised to use this broker, its credentials and the mesh's encryption key, and bridging this traffic doesn't break the broker's or the channel's rules.",
        },
        {
          id: "lawfulBasis",
          text: "I have a lawful basis for this processing, such as legitimate interest, and I tell the people whose nodes appear on this channel how their data is used.",
        },
        {
          id: "minimisation",
          text: "I'll use the narrowest topic filter that covers my mesh, I won't bridge traffic I don't need, and I'll archive only the devices I need and only while I need them.",
        },
        {
          id: "sensitive",
          text: "I won't use this source to collect sensitive data, such as health information, or to track or profile individuals.",
        },
      ],
      footnote:
        "You can withdraw at any time: delete the source's meshes, then the source, and the bridge stops. Questions or data requests: info@sensical.es.",
      retention_limited:
        "This acceptance is valid for {days} days. We'll email you before it lapses so you can renew it. If you don't, the source is paused, and the data of its meshes, including any archive, is deleted {grace} days later unless you renew in the meantime.",
      retention_unlimited:
        "Data from this source is kept while the source is in use. When a mesh is deleted or moved off the source, its data, including any archive, is deleted {grace} days later.",
    },
    es: {
      title: "Antes de conectar una fuente",
      description:
        "Una fuente trae a Mesh Things el tráfico de un bróker que tú eliges. Ese tráfico puede incluir datos personales de personas que nunca se han registrado aquí: nombres de nodo, identificadores de dispositivo, posiciones y telemetría. En este tráfico tú decides qué se recoge y para qué, y Sensical lo trata solo por tu cuenta para prestar el servicio. Marca cada casilla para continuar.",
      statements: [
        {
          id: "controller",
          text: "Actúo como responsable del tratamiento del tráfico que trae esta fuente. Autorizo a Sensical a recibirlo, descifrarlo y almacenarlo por mi cuenta como encargado del tratamiento, según el Acuerdo de procesamiento de los datos ({dpa_url}). Esto incluye conservar los dispositivos que elija en un archivo a largo plazo que puedo descargar.",
        },
        {
          id: "authority",
          text: "Estoy autorizado a usar este bróker, sus credenciales y la clave de cifrado de la malla, y traer este tráfico no incumple las normas del bróker ni del canal.",
        },
        {
          id: "lawfulBasis",
          text: "Tengo una base jurídica para este tratamiento, como el interés legítimo, e informo a las personas cuyos nodos aparecen en este canal de cómo se usan sus datos.",
        },
        {
          id: "minimisation",
          text: "Usaré el filtro de tema más estrecho que cubra mi malla, no traeré tráfico que no necesite y archivaré solo los dispositivos que necesite y solo mientras los necesite.",
        },
        {
          id: "sensitive",
          text: "No usaré esta fuente para recoger datos sensibles, como información de salud, ni para seguir o perfilar a personas.",
        },
      ],
      footnote:
        "Puedes retirarte cuando quieras: elimina las mallas de la fuente y después la fuente, y el puente se detiene. Dudas o solicitudes sobre datos: info@sensical.es.",
      retention_limited:
        "Esta aceptación es válida durante {days} días. Te avisaremos por correo antes de que caduque para que puedas renovarla. Si no lo haces, la fuente se pausa y los datos de sus mallas, incluido cualquier archivo, se borran {grace} días después salvo que renueves antes.",
      retention_unlimited:
        "Los datos de esta fuente se conservan mientras la fuente esté en uso. Cuando una malla se elimina o deja la fuente, sus datos, incluido cualquier archivo, se borran {grace} días después.",
    },
  },
  sink: {
    en: {
      title: "Before you create a sink",
      description:
        "A sink lets a service you choose subscribe to readings from your meshes and devices, with credentials only you hold. Those readings can include personal data from people who never signed up here: node names, device IDs, positions and telemetry. You decide who receives them and why, and Sensical sends them only on your instructions. Tick each box to continue.",
      statements: [
        {
          id: "controller",
          text: "I act as data controller for the readings this sink sends. I instruct Sensical, as processor under the Data Processing Agreement ({dpa_url}), to make them available to whoever holds the sink's credentials.",
        },
        {
          id: "recipient",
          text: "I'll give the credentials only to recipients I trust with this data, and I'm responsible for how they use it.",
        },
        {
          id: "lawfulBasis",
          text: "I have a lawful basis for sharing these readings, and I tell the people whose nodes appear in them who receives their data.",
        },
        {
          id: "minimisation",
          text: "I'll attach only the meshes and devices the recipient needs, choose only the streams it needs, and remove them when it no longer does.",
        },
      ],
      footnote:
        "You can withdraw at any time: detach the sink's meshes and devices, then delete the sink, and its credentials stop working. Questions or data requests: info@sensical.es.",
      retention_limited:
        "This acceptance is valid for {days} days. We'll email you before it lapses so you can renew it. If you don't, the sink is paused: nothing more is sent and its credentials are refused until you renew. A sink keeps no data of its own.",
      retention_unlimited:
        "A sink keeps no data of its own. It sends readings while it is in use and stops when you delete it.",
    },
    es: {
      title: "Antes de crear un destino",
      description:
        "Un destino permite que un servicio que tú eliges se suscriba a las lecturas de tus mallas y dispositivos, con credenciales que solo tú tienes. Esas lecturas pueden incluir datos personales de personas que nunca se han registrado aquí: nombres de nodo, identificadores de dispositivo, posiciones y telemetría. Tú decides quién las recibe y para qué, y Sensical las envía solo siguiendo tus instrucciones. Marca cada casilla para continuar.",
      statements: [
        {
          id: "controller",
          text: "Actúo como responsable del tratamiento de las lecturas que envía este destino. Encargo a Sensical, como encargado del tratamiento según el Acuerdo de procesamiento de los datos ({dpa_url}), ponerlas a disposición de quien tenga las credenciales del destino.",
        },
        {
          id: "recipient",
          text: "Daré las credenciales solo a destinatarios de confianza para estos datos, y soy responsable del uso que hagan de ellos.",
        },
        {
          id: "lawfulBasis",
          text: "Tengo una base jurídica para compartir estas lecturas, e informo a las personas cuyos nodos aparecen en ellas de quién recibe sus datos.",
        },
        {
          id: "minimisation",
          text: "Asociaré solo las mallas y dispositivos que el destinatario necesite, elegiré solo los flujos que necesite y los quitaré cuando ya no los necesite.",
        },
      ],
      footnote:
        "Puedes retirarte cuando quieras: quita las mallas y dispositivos del destino y después elimínalo, y sus credenciales dejan de funcionar. Dudas o solicitudes sobre datos: info@sensical.es.",
      retention_limited:
        "Esta aceptación es válida durante {days} días. Te avisaremos por correo antes de que caduque para que puedas renovarla. Si no lo haces, el destino se pausa: no se envía nada más y sus credenciales se rechazan hasta que renueves. Un destino no guarda datos propios.",
      retention_unlimited:
        "Un destino no guarda datos propios. Envía lecturas mientras está en uso y deja de hacerlo cuando lo eliminas.",
    },
  },
};

export function termsLocale(value: string | null | undefined): TermsLocale {
  return value === "es" ? "es" : "en";
}

/** The current terms of `kind`; data terms (mesh, source, sink) append the retention sentence to the footnote. */
export function termsJson(kind: TermsKind, locale: TermsLocale) {
  const base = COPY[kind][locale];
  const served = {
    version: TERMS_VERSIONS[kind],
    locale,
    title: base.title,
    description: base.description,
    statements: base.statements.map((s) => ({ ...s, text: s.text.replace("{dpa_url}", DPA_URL) })),
    footnote: base.footnote,
  };
  if (kind === "account") return served;
  const text = COPY[kind][locale];
  const retention = DATA_RETENTION_DAYS
    ? text.retention_limited
        .replace("{days}", String(DATA_RETENTION_DAYS))
        .replace("{grace}", String(DATA_DELETION_GRACE_DAYS))
    : text.retention_unlimited.replace(
        "{grace}",
        String(DATA_DELETION_GRACE_DAYS),
      );
  return { ...served, footnote: `${served.footnote} ${retention}` };
}

/** When an acceptance made at `from` lapses, or null with no retention period. */
export function acceptanceExpiry(from: Date): string | null {
  if (!DATA_RETENTION_DAYS) return null;
  return new Date(
    from.getTime() + DATA_RETENTION_DAYS * 86_400_000,
  ).toISOString();
}

/** One row per acceptance, platform or source; kept after the owner or source is deleted. */
export type TermsAcceptance = {
  kind: TermsKind;
  ownerId: string | null;
  sourceId: string | null;
  termsVersion: string;
  locale: TermsLocale;
  acceptedAt: string;
  expiresAt: string | null;
};

/** A mesh's or a source's standing with its terms, as the API reports it. */
export type TermsStanding = {
  acceptedVersion: string | null;
  expiresAt: string | null;
  pausedAt: string | null;
};
