export class Sala{

    public id:              string;
    public nome:            string;
    public usuario:         string;


    constructor(obj ?: Partial<Sala>){
        if(obj){
            this.id         =obj.id
            this.nome       =obj.nome
            this.usuario    =obj.usuario

        }
    }

    toString () {
        const objeto = `{
        "id"            :       "${this.id}",
        "nome"          :       "${this.nome}",
        "usuario"         :     "${this.usuario}",
        
      }`
      return objeto
    }

    toFirestore(){
        const sala = {
            id          : this.id,
            nome        : this.nome,
            usuario     : this.usuario,
        }
        return sala
    }

}

 