export const STATUS: Record<string, string> = {
  ready: "Pronta",
  live: "Em andamento",
  finished: "Encerrada",
  analyzed: "Concluída",
  cancelled: "Cancelada",
  restarted: "Reiniciada",
  failed: "Falhou",
  none: "Não iniciada",
  sent: "Enviado",
  used: "Aceito",
  revoked: "Cancelado",
  expired: "Expirado",
};

export const TEST_NAME: Record<string, string> = { completa: "Mapa de Talentos", rapida: "Mapa rápido" };

export const ROLE: Record<string, string> = { owner: "Responsável", admin: "Administração", participant: "Participante" };

export const STAGE: Record<string, string> = {
  imported: "Na lista",
  invited: "Convidado",
  accepted: "Aceitou",
  interviewing: "Em entrevista",
  analyzed: "Analisado",
  expired: "Convite expirado",
  private: "Análise privada",
};

export const STAGE_TIP: Record<string, string> = {
  imported: "Ainda não recebeu convite.",
  invited: "Recebeu o link e ainda não criou a conta.",
  accepted: "Criou a conta e ainda não começou a entrevista.",
  interviewing: "Começou a conversa com a Lia.",
  analyzed: "Entrevista concluída e analisada.",
  expired: "O link venceu. Reenvie para dar outra chance.",
  private: "A pessoa não autorizou ver a análise, ou a conversa trouxe um tema sensível. O resultado fica só com ela.",
};
