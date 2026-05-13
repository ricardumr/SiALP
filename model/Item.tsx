import { Sala } from "./Sala";
export class Item{


    public id:              string;
    public nome:            string;
    public estado:          string;
    public patrimonio:      string;
    public observacao:      string;
    public sala:           string;

    constructor(obj ?: Partial<Item>){
        if(obj){
            this.id         =obj.id
            this.nome       =obj.nome
            this.estado     =obj.estado
            this.patrimonio =obj.patrimonio
            this.observacao =obj.observacao
            this.sala       =obj.sala
        }
    }

    toString () {
        const objeto = `{
        "id"            :       "${this.id}",
        "nome"          :       "${this.nome}",
        "estado"        :       "${this.estado}",
        "patrimonio"    :       "${this.patrimonio}",
        "observacao"    :       "${this.observacao}",
        "sala"          :       "${this.sala}"
      }`
      return objeto
    }

    toFirestore(){
        const item = {
            id          : this.id,
            nome        : this.nome,
            estado      : this.estado,
            patrimonio  : this.patrimonio,
            observacao  : this.observacao,
            sala        : this.sala
        }
        return item
    }

}

 