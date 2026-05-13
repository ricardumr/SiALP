export class Usuario{

    public id:          string;
    public nome:        string;
    public email:       string;
    public senha:       string;
    public adm:         boolean;
    public bancoId:     string;


    constructor(obj ?: Partial<Usuario>){
        if(obj){
            this.id         =obj.id
            this.nome       =obj.nome
            this.email      =obj.email
            this.senha      =obj.senha
            this.adm        =obj.adm
            this.bancoId    =obj.bancoId
        }
    }

    toString () {
        const objeto = `{
        "id"            :       "${this.id}",
        "nome"          :       "${this.nome}",
        "email"         :       "${this.email}",
        "senha"         :       "${this.senha}",
        "adm"           :       "${this.adm}",
        "bancoId"       :       "${this.bancoId}"
      }`    
      return objeto
    }

    toFirestore(){
        const usuario = {
            id          : this.id,
            nome        : this.nome,
            email       : this.email,
            senha       : this.senha,
            adm         : this.adm,
            bancoId     : this.bancoId
        }
        return usuario
    }

}

 
