export class Conferencia {
  public id: string;
  public data: Date;
  public itens: Array<{
    itemId: string;
    itemNome: string;
    sala: string;
    patrimonio: string;
    status: "correct" | "wrong" | "not_found";
  }>;

  // quem criou a conferência (uid + email)
  public createdByUid?: string;
  public createdByEmail?: string;

  constructor(obj?: Partial<Conferencia>) {
    if (obj) {
      this.id = obj.id;
      this.data = obj.data || new Date();
      this.itens = obj.itens || [];
      this.createdByUid = obj.createdByUid;
      this.createdByEmail = obj.createdByEmail;
    }
  }

  toString() {
    const objeto = `{
        "id"            :       "${this.id}",
        "data"          :       "${this.data}",
        "itens"         :       ${JSON.stringify(this.itens)},
        "createdByUid"  :       "${this.createdByUid}",
        "createdByEmail":       "${this.createdByEmail}"
      }`;
    return objeto;
  }

  toFirestore() {
    return {
      id: this.id,
      data: this.data,
      itens: this.itens,
      timestamp: new Date(),
      createdByUid: this.createdByUid,
      createdByEmail: this.createdByEmail,
    };
  }
}
