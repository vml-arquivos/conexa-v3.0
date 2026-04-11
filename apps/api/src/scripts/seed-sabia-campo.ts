import { PrismaClient, RoleLevel } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const UNIT_ID        = 'cmmbhsz1o0005mempvrlz3n0g';
const MANTENEDORA_ID = 'mant-cocris-001';
const SENHA_PADRAO   = 'Teste@123';

const TURMAS = [
  {"name":"Berçário I — AMANDA","code":"BERÇÁRIO-I-AMANDA","ageGroupMin":0,"ageGroupMax":12},
  {"name":"Berçário II — DÉBORA","code":"BERÇÁRIO-II-DÉBORA","ageGroupMin":13,"ageGroupMax":18},
  {"name":"Berçário II — CARLA","code":"BERÇÁRIO-II-CARLA","ageGroupMin":13,"ageGroupMax":18},
  {"name":"Maternal I — CÁTIA","code":"MATERNAL-I-CÁTIA","ageGroupMin":19,"ageGroupMax":47},
  {"name":"Maternal I — MARLENE","code":"MATERNAL-I-MARLENE","ageGroupMin":19,"ageGroupMax":47},
  {"name":"Maternal I — LUARA","code":"MATERNAL-I-LUARA","ageGroupMin":19,"ageGroupMax":47},
  {"name":"Maternal I — NELCI","code":"MATERNAL-I-NELCI","ageGroupMin":19,"ageGroupMax":47},
  {"name":"Maternal I — MARIA","code":"MATERNAL-I-MARIA","ageGroupMin":19,"ageGroupMax":47},
  {"name":"Maternal II — TATILA","code":"MATERNAL-II-TATILA","ageGroupMin":48,"ageGroupMax":71},
  {"name":"Maternal II — TÁTILA","code":"MATERNAL-II-TÁTILA","ageGroupMin":48,"ageGroupMax":71},
  {"name":"Maternal II — ELENICE","code":"MATERNAL-II-ELENICE","ageGroupMin":48,"ageGroupMax":71},
  {"name":"Maternal II — AMANDA","code":"MATERNAL-II-AMANDA","ageGroupMin":48,"ageGroupMax":71},
];

const TURMA_CHAVES = [
  "Maternal I::MARLENE",
  "Maternal II::ELENICE",
  "Ber\u00e7\u00e1rio II::CARLA",
  "Maternal II::MARIA JUCELIA",
  "Ber\u00e7\u00e1rio I::AMANDA",
  "Maternal I::NELCI",
  "Maternal II::TATILA",
  "Maternal I::C\u00c1TIA",
  "Ber\u00e7\u00e1rio II::D\u00c9BORA",
  "Maternal II::T\u00c1TILA",
  "Maternal II::LUARA",
  "Ber\u00e7\u00e1rio II::AMANDA",
];

const ALUNOS = [
  {"firstName": "ABIMAEL", "lastName": "ALVES DE SOUSA", "cpf": "040.793.371-91", "dateOfBirth": "2024-01-27T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "O+", "raca": "PARDA", "peso": null, "emergencyContactName": "FRANCISCA DE SOUSA", "emergencyContactPhone": "61 9 8140-5620", "celPai": null, "turmaChave": "Maternal I::MARLENE"},
  {"firstName": "ADRIELLY", "lastName": "CARLOS DE SOUZA PINTO", "cpf": "117.072.391-85", "dateOfBirth": "2022-09-07T12:00:00.000Z", "gender": "FEMININO", "bloodType": "A+", "raca": "BRANCA", "peso": "13,2 KG", "emergencyContactName": "KAMILA CARLOS DE SOUZA PINTO", "emergencyContactPhone": "61 9 8307-0285", "celPai": "61 9 9870-0285", "turmaChave": "Maternal II::ELENICE"},
  {"firstName": "ADRYAN", "lastName": "GUENNES ROCHA", "cpf": "121.589.941-69", "dateOfBirth": "2024-06-22T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "O +", "raca": "PARDA", "peso": "7,7 KG", "emergencyContactName": "BÉBORA RAMONA GUENNER DE OLIVEIRA", "emergencyContactPhone": "61 9 9340-5573", "celPai": "61 9 9404-1014", "turmaChave": "Berçário II::CARLA"},
  {"firstName": "AGATA", "lastName": "ATAIDE DOS SANTOS", "cpf": "119.120.891-57", "dateOfBirth": "2023-03-25T12:00:00.000Z", "gender": "FEMININO", "bloodType": "A+", "raca": "BRANCA", "peso": "13 KG", "emergencyContactName": "SAMA ATAIDE DA SILVA", "emergencyContactPhone": "61 9 8511-6879", "celPai": "61 9 9444-3257", "turmaChave": "Maternal II::MARIA JUCELIA"},
  {"firstName": "AGATHA", "lastName": "ALVES DE SOUSA", "cpf": "117.915.991-84", "dateOfBirth": "2022-12-01T12:00:00.000Z", "gender": "FEMININO", "bloodType": "A+", "raca": "PARDA", "peso": null, "emergencyContactName": "FRANCISCA DE SOUSA", "emergencyContactPhone": "61 9 8140-5620", "celPai": null, "turmaChave": "Maternal II::MARIA JUCELIA"},
  {"firstName": "ALANA", "lastName": "PAIZINHO CURVINA", "cpf": "120.151.331-60", "dateOfBirth": "2023-06-25T12:00:00.000Z", "gender": "FEMININO", "bloodType": "O+", "raca": "PARDA", "peso": "8,6 KG", "emergencyContactName": "LIDIANE MACIEL CURVINA", "emergencyContactPhone": "61 9 9369-0397", "celPai": "61 9 9258-4708", "turmaChave": "Maternal I::MARLENE"},
  {"firstName": "ALEX", "lastName": "JOTA DIOGENES BRITO", "cpf": "127.029.231-51", "dateOfBirth": "2025-08-03T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "A+", "raca": "BRANCA", "peso": "8,4 KG", "emergencyContactName": "ALANA JOTA DIÓGENES FIGUEIREDO", "emergencyContactPhone": "(12) 9 9772-6384", "celPai": "61 9 9888-5537", "turmaChave": "Berçário I::AMANDA"},
  {"firstName": "ALICE", "lastName": "CAROLINE OLIVEIRA DE SOUZA", "cpf": "118.029.901-94", "dateOfBirth": "2022-12-14T12:00:00.000Z", "gender": "FEMININO", "bloodType": "O+", "raca": "BRANCA", "peso": "16 KG", "emergencyContactName": "BRUNA MARIA ANTONIA DE SOUZA", "emergencyContactPhone": "61 9 8339-9997", "celPai": null, "turmaChave": "Maternal II::ELENICE"},
  {"firstName": "ALICE", "lastName": "FRANCA MENEZES", "cpf": "033.819.271-91", "dateOfBirth": "2024-01-01T12:00:00.000Z", "gender": "FEMININO", "bloodType": "O+", "raca": "BRANCA", "peso": "9 KG", "emergencyContactName": "DAIANNY DA SILVA MENESES", "emergencyContactPhone": "61 9 9372-1407", "celPai": null, "turmaChave": "Maternal I::MARLENE"},
  {"firstName": "ALICE", "lastName": "JESUS MARTINS", "cpf": "012.443.881-49", "dateOfBirth": "2023-10-19T12:00:00.000Z", "gender": "FEMININO", "bloodType": null, "raca": "PARDA", "peso": null, "emergencyContactName": "FABIULA MARTINS BEZERRA", "emergencyContactPhone": "61 9 8138-5829", "celPai": null, "turmaChave": "Maternal I::MARLENE"},
  {"firstName": "ALICE", "lastName": "PEREIRA BATISTA", "cpf": "120.976.681-78", "dateOfBirth": "2023-09-16T12:00:00.000Z", "gender": "FEMININO", "bloodType": null, "raca": "PARDA", "peso": "15,1 KG", "emergencyContactName": "VERÔNICA PEREIRA DE CARVALHO", "emergencyContactPhone": "61 9 9802-4334", "celPai": null, "turmaChave": "Maternal I::NELCI"},
  {"firstName": "ALICIA", "lastName": "LARA RAMOS DA SILVA", "cpf": "116.102.911-74", "dateOfBirth": "2022-05-29T12:00:00.000Z", "gender": "FEMININO", "bloodType": null, "raca": "PARDA", "peso": "17 KG", "emergencyContactName": "JHENNY MICAELLA RAMOS DE SOUSA", "emergencyContactPhone": "61 9 9451-8958", "celPai": "61 9 9233-5912", "turmaChave": "Maternal II::MARIA JUCELIA"},
  {"firstName": "AMELIE", "lastName": "OLIVEIRA CRUZ", "cpf": "068.264.901-53", "dateOfBirth": "2024-04-08T12:00:00.000Z", "gender": "FEMININO", "bloodType": "B+", "raca": "PARDA", "peso": "8 KG", "emergencyContactName": "JESSYCA SANTOS DE OLIVEIRA", "emergencyContactPhone": "61 9 9503-6375", "celPai": "61 9 8375-8416", "turmaChave": "Berçário II::CARLA"},
  {"firstName": "ANA", "lastName": "ALICIA BATISTA RODRIGUES RAMOS", "cpf": "119.170.061-52", "dateOfBirth": "2023-03-30T12:00:00.000Z", "gender": "FEMININO", "bloodType": null, "raca": "PARDA", "peso": null, "emergencyContactName": "ANA CAROLINE BATISTA RODRIGUES", "emergencyContactPhone": "61 9 8182-1008", "celPai": "61 9 8182-2081", "turmaChave": "Maternal II::TATILA"},
  {"firstName": "ANA", "lastName": "JULIA ALVES BATISTA CHAGAS", "cpf": "065.691.021-68", "dateOfBirth": "2024-04-02T12:00:00.000Z", "gender": "FEMININO", "bloodType": "A+", "raca": "BRANCA", "peso": "3,2 KG", "emergencyContactName": "RENATA HELEN ALVES LIMA", "emergencyContactPhone": "61 9 8262-3853", "celPai": null, "turmaChave": "Berçário II::CARLA"},
  {"firstName": "ANA", "lastName": "JULIA OLIVEIRA DE SOUZA", "cpf": "118.029.891-88", "dateOfBirth": "2022-12-14T12:00:00.000Z", "gender": "FEMININO", "bloodType": null, "raca": "PARDA", "peso": null, "emergencyContactName": "BRUNA MARIA ANTONIA DE SOUZA", "emergencyContactPhone": "61 9 8339-9997", "celPai": null, "turmaChave": "Maternal II::TATILA"},
  {"firstName": "ANA", "lastName": "LAURA DA COSTA PACHECO", "cpf": "120.409.711-90", "dateOfBirth": "2023-07-21T12:00:00.000Z", "gender": "FEMININO", "bloodType": "B+", "raca": "PRETA", "peso": "7 KG", "emergencyContactName": "JOSIANE PEREIRA DA COSTA", "emergencyContactPhone": "619 9294-3628", "celPai": "61 9 9961-9247", "turmaChave": "Maternal I::MARLENE"},
  {"firstName": "ANA", "lastName": "LIZ DOS SANTOS SOUSA", "cpf": "120.345.731-61", "dateOfBirth": "2023-07-10T12:00:00.000Z", "gender": "FEMININO", "bloodType": "A+", "raca": "PARDA", "peso": "17 KG", "emergencyContactName": "DAIANE VIEIRA DOS SANTOS", "emergencyContactPhone": "61 9 9552-0379", "celPai": "61 9 9134-7521", "turmaChave": "Maternal I::MARLENE"},
  {"firstName": "ANTHONY", "lastName": "DARY SOARES OLIVEIRA", "cpf": "037.087.131-68", "dateOfBirth": "2024-01-15T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "O+", "raca": "PARDA", "peso": "11,4 KG", "emergencyContactName": "MÁRCIA SOARES NOGUEIRA", "emergencyContactPhone": null, "celPai": "61 9 8429-1754", "turmaChave": "Maternal I::MARLENE"},
  {"firstName": "ANTHONY", "lastName": "FERREIRA ALVES", "cpf": "119.695.911-02", "dateOfBirth": "2023-05-16T12:00:00.000Z", "gender": "MASCULINO", "bloodType": null, "raca": "PARDA", "peso": "15 KG", "emergencyContactName": "MARIA EVELYN BATISTA FERREIRA", "emergencyContactPhone": "61 9 9301-1321", "celPai": "61 9 9591-0694", "turmaChave": "Maternal I::CÁTIA"},
  {"firstName": "ANTHONY", "lastName": "VICTOR SOUZA DA SILVA", "cpf": "051.648.691-87", "dateOfBirth": "2024-02-23T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "A+", "raca": "PARDA", "peso": "10 KG", "emergencyContactName": "MICHELE VICTOR PINTO DA SILVA", "emergencyContactPhone": "61 9 8683-0533", "celPai": "61 9 8563-9740", "turmaChave": "Maternal I::NELCI"},
  {"firstName": "ARTHUR", "lastName": "BOAZ ALVES MONTEIRO", "cpf": "116.464.321-50", "dateOfBirth": "2022-07-05T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "B+", "raca": "PARDA", "peso": "12 KG", "emergencyContactName": "PÉROLA ALVES DO NASCIMENTO", "emergencyContactPhone": "61 9 8264-6599", "celPai": "61 9 8180-8471", "turmaChave": "Maternal II::TATILA"},
  {"firstName": "AURORA", "lastName": "ESTACIO DE OLIVEIRA", "cpf": "115.501.211-97", "dateOfBirth": "2022-04-06T12:00:00.000Z", "gender": "FEMININO", "bloodType": "O+", "raca": "PARDA", "peso": "20 KG", "emergencyContactName": "ALYNE SOUZA DE OLIVEIRA", "emergencyContactPhone": "61 9 9809-5097", "celPai": null, "turmaChave": "Maternal II::ELENICE"},
  {"firstName": "AURORA", "lastName": "PEREIRA BATISTA", "cpf": "120.976.511-00", "dateOfBirth": "2023-09-16T12:00:00.000Z", "gender": "FEMININO", "bloodType": null, "raca": "PARDA", "peso": null, "emergencyContactName": "VERÔNICA PEREIRA DE CARVALHO", "emergencyContactPhone": "61 9 9802-4334", "celPai": null, "turmaChave": "Maternal I::MARLENE"},
  {"firstName": "AYLA", "lastName": "HELOISE ALVES DE OLIVEIRA", "cpf": "116.355.851-63", "dateOfBirth": "2022-06-27T12:00:00.000Z", "gender": "FEMININO", "bloodType": "O+", "raca": "BRANCA", "peso": null, "emergencyContactName": "NATHÁLIA CRISTINA ALVES DE OLIVEIRA", "emergencyContactPhone": "61 9 9680-7543", "celPai": null, "turmaChave": "Maternal II::ELENICE"},
  {"firstName": "AYLLA", "lastName": "DE FRANCA SOUZA", "cpf": "118.268.081-08", "dateOfBirth": "2023-01-06T12:00:00.000Z", "gender": "FEMININO", "bloodType": "B+", "raca": "PARDA", "peso": "13 KG", "emergencyContactName": "LOHRANA DA SILVA SOUZA", "emergencyContactPhone": "61 9 9403-0778", "celPai": "61 9 9504-8782", "turmaChave": "Maternal II::MARIA JUCELIA"},
  {"firstName": "AYLLA", "lastName": "VICTORIA OLIVEIRA MELO", "cpf": "119.760.971-77", "dateOfBirth": "2023-05-22T12:00:00.000Z", "gender": "FEMININO", "bloodType": "O +", "raca": "PARDA", "peso": "11 KG", "emergencyContactName": "FRANCISCA VIRGINIA DE MELO", "emergencyContactPhone": "61 98151-5795", "celPai": null, "turmaChave": "Maternal I::CÁTIA"},
  {"firstName": "AYRA", "lastName": "ELOAH GOMES DA SILVA", "cpf": "115.841.741-10", "dateOfBirth": "2022-05-06T12:00:00.000Z", "gender": "FEMININO", "bloodType": "A+", "raca": "PRETA", "peso": "11 KG", "emergencyContactName": "LUCILEIDE GOMES DA SILVA", "emergencyContactPhone": "61 9 8319-5455", "celPai": null, "turmaChave": "Maternal II::ELENICE"},
  {"firstName": "BENICIO", "lastName": "DE CASTRO ALVES", "cpf": "116.025.511-38", "dateOfBirth": "2022-05-24T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "O+", "raca": "PARDA", "peso": "15 KG", "emergencyContactName": "FRANCIDETE GONÇALVES DE CASTRO", "emergencyContactPhone": "61 9 8102-0954", "celPai": "61 9 9366-4158", "turmaChave": "Maternal II::MARIA JUCELIA"},
  {"firstName": "BENJAMIM", "lastName": "LOPES VIEIRA DO NASCIMENTO", "cpf": "120.834.471-40", "dateOfBirth": "2023-08-25T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "A+", "raca": "PARDA", "peso": "16 KG", "emergencyContactName": "VALDIRENE LOPES VIEIRA DO NASCIMENTO", "emergencyContactPhone": "61 9 9994-6294", "celPai": "61 9 9824-0813", "turmaChave": "Maternal I::CÁTIA"},
  {"firstName": "BERNARDO", "lastName": "SOUZA DE OLIVEIRA", "cpf": "122.932.001-67", "dateOfBirth": "2024-10-08T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "AB+", "raca": "PARDA", "peso": "9,2 KG", "emergencyContactName": "MARIA AUXILIADORA BARBOSA SOUZA DE OLIVEIRA", "emergencyContactPhone": "61 9 9387-3944", "celPai": "61 9 9306-9855", "turmaChave": "Berçário II::DÉBORA"},
  {"firstName": "BRAYAN", "lastName": "HENRIQUE ANDRADE DA SILVA", "cpf": "053.933.611-49", "dateOfBirth": "2024-03-03T12:00:00.000Z", "gender": "MASCULINO", "bloodType": null, "raca": null, "peso": null, "emergencyContactName": "THAIS ANDRADE DE AZEVEDO", "emergencyContactPhone": "61 9 9661-0215", "celPai": null, "turmaChave": "Maternal I::MARLENE"},
  {"firstName": "BRENO", "lastName": "ARTHUR ROCHA CALDEIRA", "cpf": "116.044.161-81", "dateOfBirth": "2022-05-03T12:00:00.000Z", "gender": "MASCULINO", "bloodType": null, "raca": "PARDA", "peso": null, "emergencyContactName": "ALLANA CRISTINA ROCHA DOS SANTOS", "emergencyContactPhone": "61 9 9452-6070", "celPai": null, "turmaChave": "Maternal II::ELENICE"},
  {"firstName": "BRYAN", "lastName": "HENRIQUE OLIVEIRA MAGALHAES", "cpf": "117.348.661-52", "dateOfBirth": "2022-10-10T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "O+", "raca": "PARDA", "peso": "8,9 KG", "emergencyContactName": "SHEILA ALVES DE OLIVEIRA", "emergencyContactPhone": "61 9 9697-3484", "celPai": "61 9 9801-4393", "turmaChave": "Maternal II::MARIA JUCELIA"},
  {"firstName": "BRIAN", "lastName": "BATISTA DE ALMEIDA", "cpf": "121.741.241-73", "dateOfBirth": "2024-07-08T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "O+", "raca": "PARDA", "peso": "15 KG", "emergencyContactName": "NATHIELLY CRISTINE BATISTA DE SOUSA", "emergencyContactPhone": "61 9 9305-3877", "celPai": "61 9 8185-5179", "turmaChave": "Berçário II::CARLA"},
  {"firstName": "BRYAN", "lastName": "MIGUEL SANTOS MELO", "cpf": "116.250.191-06", "dateOfBirth": "2022-06-14T12:00:00.000Z", "gender": "MASCULINO", "bloodType": null, "raca": "BRANCA", "peso": "14,5 KG", "emergencyContactName": "BEATRIZ SANTOS BARROS", "emergencyContactPhone": "61 9 9204-2531", "celPai": "61 9 8159-0284", "turmaChave": "Maternal II::ELENICE"},
  {"firstName": "CALIEL", "lastName": "MULLER SANTOS DE OLIVEIRA", "cpf": "118.856.901-50", "dateOfBirth": "2023-03-02T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "B+", "raca": "PARDA", "peso": "12,2 KG", "emergencyContactName": "CLEZIA PEREIRA DE OLIVEIRA COSTA", "emergencyContactPhone": "61 9 9670-7076", "celPai": "61 9 9396-8149", "turmaChave": "Maternal II::TATILA"},
  {"firstName": "CECILIA", "lastName": "RODRIGUES PEREIRA", "cpf": "041.629.351-49", "dateOfBirth": "2024-01-30T12:00:00.000Z", "gender": "FEMININO", "bloodType": "O +", "raca": "BRANCA", "peso": "10 KG", "emergencyContactName": "ANDRIELLY PEREIRA LOPES", "emergencyContactPhone": "61 9 9392-6465", "celPai": "61 9 9120-6297", "turmaChave": "Maternal I::NELCI"},
  {"firstName": "CELINE", "lastName": "DE SOUZA ALEMITES", "cpf": "121.859.271-08", "dateOfBirth": "2024-07-16T12:00:00.000Z", "gender": "FEMININO", "bloodType": "B+", "raca": "PARDA", "peso": "11 KG", "emergencyContactName": "ALICE DE SOUSA MELO ALEMITES", "emergencyContactPhone": "61 9 8159-0739", "celPai": "61 9 8284-4428", "turmaChave": "Berçário II::DÉBORA"},
  {"firstName": "DARWIN", "lastName": "FERREIRA MACEDO", "cpf": "118.099.681-00", "dateOfBirth": "2022-12-27T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "B+", "raca": "BRANCA", "peso": "12 KG", "emergencyContactName": "GABRIELA FERREIRA VIEIRA MACEDO", "emergencyContactPhone": "61 9 8663-7826", "celPai": "61 9 9631-7965", "turmaChave": "Maternal II::TATILA"},
  {"firstName": "DAVI", "lastName": "LUCCA ARAUJO FERREIRA", "cpf": "039.429.101-87", "dateOfBirth": "2024-01-23T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "O-", "raca": "BRANCA", "peso": "9,8 KG", "emergencyContactName": "ERIKA ARAUJO SILVA CRUZ", "emergencyContactPhone": "61 9 9597-2831", "celPai": "61 9 9204-1013", "turmaChave": "Maternal I::MARLENE"},
  {"firstName": "DAVI", "lastName": "LUCCA SEVERO DANTAS", "cpf": "123.986.121-47", "dateOfBirth": "2024-12-19T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "B+", "raca": "PARDA", "peso": "10 KG", "emergencyContactName": "GILVANIA DIAS DANTAS", "emergencyContactPhone": "61 9 9279-1716", "celPai": "61 9 9584-2724", "turmaChave": "Berçário II::CARLA"},
  {"firstName": "DAVI", "lastName": "MOREIRA BRAGA", "cpf": "027.978.011-72", "dateOfBirth": "2023-12-07T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "A+", "raca": "PARDA", "peso": "12 KG", "emergencyContactName": "LORRANE MOREIRA DE ALMEIDA BRAGA", "emergencyContactPhone": "61 9 9350-5183", "celPai": "61 9 9540-6976", "turmaChave": "Maternal I::CÁTIA"},
  {"firstName": "DILAN", "lastName": "GABRIEL PEREIRA TRINDADE", "cpf": "060.993.431-72", "dateOfBirth": "2024-03-19T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "A+", "raca": "PARDA", "peso": "15 KG", "emergencyContactName": "ANA GABRIELA ALVES TRINDADE", "emergencyContactPhone": "61 9 8102-6311", "celPai": null, "turmaChave": "Maternal I::NELCI"},
  {"firstName": "EDUARDO", "lastName": "DOS SANTOS SOUSA", "cpf": "122.412.851-61", "dateOfBirth": "2024-08-30T12:00:00.000Z", "gender": "MASCULINO", "bloodType": null, "raca": "BRANCA", "peso": "6,9 KG", "emergencyContactName": "VALÉRIA PEREIRA DOS SANTOS", "emergencyContactPhone": "61 9 8421-2894", "celPai": null, "turmaChave": "Berçário II::CARLA"},
  {"firstName": "ELLOANY", "lastName": "MARCAL DOS SANTOS GOES", "cpf": "117.990.861-94", "dateOfBirth": "2022-12-14T12:00:00.000Z", "gender": "FEMININO", "bloodType": "A+", "raca": "BRANCA", "peso": "13 KG", "emergencyContactName": "GABRIELE MARÇAL FERNANDES", "emergencyContactPhone": "61  9 8664-6137", "celPai": "61 9 8601-1778", "turmaChave": "Maternal II::MARIA JUCELIA"},
  {"firstName": "ELOA", "lastName": "MARQUES DE QUEIROZ", "cpf": "122.713.071-63", "dateOfBirth": "2024-09-22T12:00:00.000Z", "gender": "FEMININO", "bloodType": "A+", "raca": "PARDA", "peso": "5 KG", "emergencyContactName": "ANA BEATRIZ DE QUEIROZ MATOS", "emergencyContactPhone": "61 9 8678-5008", "celPai": "61 9 8142-3926", "turmaChave": "Berçário II::CARLA"},
  {"firstName": "EVELLYN", "lastName": "SOUSA QUARESMA", "cpf": "125.031.071-76", "dateOfBirth": "2025-03-17T12:00:00.000Z", "gender": "FEMININO", "bloodType": "O+", "raca": "BRANCA", "peso": "9 KG", "emergencyContactName": "FRANCISCA EVA SONARA", "emergencyContactPhone": "61 9 8227-8352", "celPai": "61 98177-1464", "turmaChave": "Berçário II::CARLA"},
  {"firstName": "EVERTON", "lastName": "DOS SANTOS SOUSA", "cpf": "116.408.971-43", "dateOfBirth": "2022-07-02T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "O+", "raca": "BRANCA", "peso": "15 KG", "emergencyContactName": "VALÉRIA PEREIRA DOS SANTOS", "emergencyContactPhone": "61 9 8421-2894", "celPai": null, "turmaChave": "Maternal II::ELENICE"},
  {"firstName": "GABRIEL", "lastName": "RODRIGUES DOS SANTOS", "cpf": "117.075.721-94", "dateOfBirth": "2022-09-08T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "B-", "raca": "PARDA", "peso": "13 KG", "emergencyContactName": "ALDECI FRANCISCA DOS SANTOS", "emergencyContactPhone": "61 9 9833-7476", "celPai": "61 9 9952-6863", "turmaChave": "Maternal II::ELENICE"},
  {"firstName": "GABRIELA", "lastName": "SOUZA DA SILVA", "cpf": "064.328.911-91", "dateOfBirth": "2024-03-27T12:00:00.000Z", "gender": "FEMININO", "bloodType": "O+", "raca": "PARDA", "peso": "10 KG", "emergencyContactName": "NAYARA RIBEIRO DA SILVA", "emergencyContactPhone": "61 9 9320-6098", "celPai": "61 9 9141-3725", "turmaChave": "Maternal I::CÁTIA"},
  {"firstName": "GABRIELLY", "lastName": "DE SOUZA SILVA", "cpf": "117.805.341-59", "dateOfBirth": "2022-11-27T12:00:00.000Z", "gender": "FEMININO", "bloodType": "O +", "raca": "BRANCA", "peso": "12,4 KG", "emergencyContactName": "AMANDA PIRES DE SOUZA", "emergencyContactPhone": "61 9 8401-5317", "celPai": "61 9 8104-0804", "turmaChave": "Maternal II::MARIA JUCELIA"},
  {"firstName": "GAEL", "lastName": "ALMEIDA RODRIGUES", "cpf": "117.208.521-89", "dateOfBirth": "2022-09-21T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "A+", "raca": "PARDA", "peso": "12 KG", "emergencyContactName": "ELAINE ALMEIDA DE SANTANA LOPES", "emergencyContactPhone": "61 9 8300-6676", "celPai": "61 9 9421-2493", "turmaChave": "Maternal II::ELENICE"},
  {"firstName": "GAEL", "lastName": "DA SILVA LEANDRO", "cpf": "120.304.161-69", "dateOfBirth": "2023-06-27T12:00:00.000Z", "gender": "FEMININO", "bloodType": "A+", "raca": "PARDA", "peso": null, "emergencyContactName": "ELÍ EURIDES DA SILVA", "emergencyContactPhone": "61 9 9223-6146", "celPai": null, "turmaChave": "Maternal I::MARLENE"},
  {"firstName": "GAEL", "lastName": "DOS SANTOS ARAUJO", "cpf": "120.020.351-80", "dateOfBirth": "2023-06-15T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "O+", "raca": "BRANCA", "peso": "14 KG", "emergencyContactName": "VANESSA PRISCILA BARBOSA DE ARAUJO", "emergencyContactPhone": "61 9 8181-3897", "celPai": "61 9 9320-2335", "turmaChave": "Maternal I::CÁTIA"},
  {"firstName": "GAEL", "lastName": "GONZAGA DE SOUZA", "cpf": "062.821.131-72", "dateOfBirth": "2024-03-20T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "O+", "raca": "PRETA", "peso": null, "emergencyContactName": "ADRIELE SOUZA DE CARVALHO", "emergencyContactPhone": "61 9 8186-8694", "celPai": "61 9 8618-4149", "turmaChave": "Maternal I::NELCI"},
  {"firstName": "GAEL", "lastName": "RAMOS DE CARVALHO", "cpf": "121.015.681-44", "dateOfBirth": "2023-09-18T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "AB +", "raca": "BRANCA", "peso": "14 KG", "emergencyContactName": "BIANCA MORAIS DE CARVALHO", "emergencyContactPhone": "61 9 8152-4692", "celPai": "61 9 9313-0900", "turmaChave": "Maternal I::NELCI"},
  {"firstName": "GAEL", "lastName": "SANTIAGO MIRANDA", "cpf": "123.536.851-37", "dateOfBirth": "2024-11-25T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "O+", "raca": "PARDA", "peso": "10 KG", "emergencyContactName": "ANA CAROLINE SANTIAGO DUARTE", "emergencyContactPhone": "61 9 9244-3191", "celPai": "61 9 8439-0241", "turmaChave": "Berçário II::DÉBORA"},
  {"firstName": "GAEL", "lastName": "SARAIVA LEITE", "cpf": "115.820.711-52", "dateOfBirth": "2022-05-05T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "A+", "raca": "PARDA", "peso": "19 KG", "emergencyContactName": "DEUSIRENE SARAIVA SOUSA", "emergencyContactPhone": "61 9 9848-2496", "celPai": "61 9 9835-1575", "turmaChave": "Maternal II::ELENICE"},
  {"firstName": "GIOVANNA", "lastName": "DE SOUZA SOARES", "cpf": "121.877.461-43", "dateOfBirth": "2024-07-17T12:00:00.000Z", "gender": "FEMININO", "bloodType": "O+", "raca": "PARDA", "peso": "11,5 KG", "emergencyContactName": "ELEN DE SOUZA OLIVEIRA", "emergencyContactPhone": "61 9 9632-3542", "celPai": "61 9 8533-0882", "turmaChave": "Berçário II::CARLA"},
  {"firstName": "GUILHERME", "lastName": "LOBO", "cpf": "115.940.641-30", "dateOfBirth": "2022-05-13T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "A+", "raca": "BRANCA", "peso": null, "emergencyContactName": "THATIANE CRISTINE DE SOUZA", "emergencyContactPhone": "61  9 9871-6651", "celPai": "61 9 9965-9227", "turmaChave": "Maternal II::MARIA JUCELIA"},
  {"firstName": "HAZAEL", "lastName": "LEVI PALMEIRA GONCALVES", "cpf": "056.470.701-59", "dateOfBirth": "2024-03-09T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "O+", "raca": null, "peso": null, "emergencyContactName": "GLENDA DAVIANE SOUZA PALMEIRA", "emergencyContactPhone": "61 9 8271-8902", "celPai": "61 9 9602-0472", "turmaChave": "Maternal I::NELCI"},
  {"firstName": "HEITOR", "lastName": "ALVES DOS SANTOS", "cpf": "116.903.531-04", "dateOfBirth": "2022-08-21T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "O+", "raca": "PARDA", "peso": "13,5 KG", "emergencyContactName": "ADRIANA ALVES RODRIGUES", "emergencyContactPhone": "61 9 9346-0987", "celPai": "61 9 9678-2337", "turmaChave": "Maternal II::MARIA JUCELIA"},
  {"firstName": "HEITOR", "lastName": "GABRIEL CORCINO VELEDA", "cpf": "121.628.581-00", "dateOfBirth": "2024-06-26T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "AB+", "raca": "BRANCA", "peso": "14 KG", "emergencyContactName": "MARIA EDUARDA CORCINO DE JESUS", "emergencyContactPhone": "61 9 9376-7909", "celPai": null, "turmaChave": "Berçário II::DÉBORA"},
  {"firstName": "HEITOR", "lastName": "GONCALVES LEAL DOS SANTOS", "cpf": "118.683.521-45", "dateOfBirth": "2023-02-14T12:00:00.000Z", "gender": "MASCULINO", "bloodType": null, "raca": "PARDA", "peso": "13 KG", "emergencyContactName": "CLARA LETICIA GONÇALVES LEAL", "emergencyContactPhone": "61 9 8291-0456", "celPai": "61 9 9276-1947", "turmaChave": "Maternal II::TATILA"},
  {"firstName": "HEITOR", "lastName": "SANTOS MARQUES", "cpf": "117.621.751-07", "dateOfBirth": "2022-10-05T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "B-", "raca": "PARDA", "peso": "17,1 KG", "emergencyContactName": "NAELY CRISTINE SANTOS TEIXEIRA", "emergencyContactPhone": "61 9 9844-8619", "celPai": "61 9 8263-9705", "turmaChave": "Maternal II::MARIA JUCELIA"},
  {"firstName": "HELENA", "lastName": "MAIA DOS SANTOS DE MATOS LEAL", "cpf": "126.302.221-95", "dateOfBirth": "2025-06-10T12:00:00.000Z", "gender": "FEMININO", "bloodType": "AB+", "raca": "BRANCA", "peso": "7,9 KG", "emergencyContactName": "MARINA MAIA DOS SANTOS LEAL", "emergencyContactPhone": "61 9 8244-1517", "celPai": "61 9 8618-0476", "turmaChave": "Berçário I::AMANDA"},
  {"firstName": "HELLENA", "lastName": "DO NASCIMENTO SILVA", "cpf": "125.370.371-03", "dateOfBirth": "2025-04-07T12:00:00.000Z", "gender": "FEMININO", "bloodType": "A+", "raca": "PARDA", "peso": "8 KG", "emergencyContactName": "HELLEN JECIANA DO NASCIMENTO SILVA", "emergencyContactPhone": "61 9 9219-3816", "celPai": "61 9 8170-7922", "turmaChave": "Berçário I::AMANDA"},
  {"firstName": "HELLENA", "lastName": "VITORIA MOURA RODRIGUES", "cpf": "118.413.361-38", "dateOfBirth": "2023-01-22T12:00:00.000Z", "gender": "FEMININO", "bloodType": "O-", "raca": "PARDA", "peso": null, "emergencyContactName": "ELIANE DOS SANTOS MOURA", "emergencyContactPhone": "61 9 8312-3593", "celPai": "61 9 9177-7456", "turmaChave": "Maternal II::MARIA JUCELIA"},
  {"firstName": "HELOISA", "lastName": "CARVALHO DE OLIVEIRA", "cpf": "120.159.851-66", "dateOfBirth": "2023-06-26T12:00:00.000Z", "gender": "FEMININO", "bloodType": "AB +", "raca": "PRETA", "peso": "13 KG", "emergencyContactName": "ROSEANE SOUZA SANTOS", "emergencyContactPhone": "61 9 8557-6070", "celPai": "61 9 9390-0724", "turmaChave": "Maternal I::CÁTIA"},
  {"firstName": "ICARO", "lastName": "MELO DE SOUZA", "cpf": "117.919.511-63", "dateOfBirth": "2022-12-06T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "O+", "raca": "BRANCA", "peso": "12 KG", "emergencyContactName": "GIOVANNA STHEFANY DE MELO RODRIGUES", "emergencyContactPhone": "61 9 9295-3074", "celPai": "61 9 9615-7834", "turmaChave": "Maternal II::TATILA"},
  {"firstName": "ISAAC", "lastName": "LIMA GOMES", "cpf": "116.927.211-86", "dateOfBirth": "2022-08-23T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "O+", "raca": "BRANCA", "peso": "10 KG", "emergencyContactName": "BRENDA AS SILVA LIMA", "emergencyContactPhone": "61 9 8155-5541", "celPai": "61 9 9805-2737", "turmaChave": "Maternal II::TATILA"},
  {"firstName": "ISAAC", "lastName": "PEREIRA DE BRITO", "cpf": "037.912.111-53", "dateOfBirth": "2024-01-20T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "O+", "raca": "PARDA", "peso": "9 KG", "emergencyContactName": "KATHLEEN KAROLINE PEREIRA DE BRITO", "emergencyContactPhone": "61 9 9652-3664", "celPai": null, "turmaChave": "Maternal I::CÁTIA"},
  {"firstName": "ISAAC", "lastName": "RODRIGUES DOS SANTOS", "cpf": "116.787.811-69", "dateOfBirth": "2022-08-07T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "A+", "raca": "PARDA", "peso": "15 KG", "emergencyContactName": "RENATA RODRIGUES LAGO", "emergencyContactPhone": "61 9 9358-0822", "celPai": "61 9 9553-1986", "turmaChave": "Maternal II::ELENICE"},
  {"firstName": "ISABELLA", "lastName": "ANDRADE DOS SANTOS SANTANA", "cpf": "123.269.011-26", "dateOfBirth": "2024-11-05T12:00:00.000Z", "gender": "FEMININO", "bloodType": "O+", "raca": "PARDA", "peso": "5,8 KG", "emergencyContactName": "ISABEL ANDRADE DOS SANTOS", "emergencyContactPhone": "61 9 9655-5088", "celPai": null, "turmaChave": "Berçário II::DÉBORA"},
  {"firstName": "ISABELLY", "lastName": "ARAGAO FORTUNATO", "cpf": "121.917.851-90", "dateOfBirth": "2024-07-21T12:00:00.000Z", "gender": "FEMININO", "bloodType": "O-", "raca": "PARDA", "peso": "10 KG", "emergencyContactName": "LAÍS RODRIGUES ARAGÃO", "emergencyContactPhone": "61 9 8406-7002", "celPai": null, "turmaChave": "Berçário II::DÉBORA"},
  {"firstName": "ISAQUE", "lastName": "MARTINS DE SOUZA", "cpf": "119.217.951-07", "dateOfBirth": "2023-04-03T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "O+", "raca": "PARDA", "peso": "9,3 KG", "emergencyContactName": "WESISLAYNE SOUSA MARTINS", "emergencyContactPhone": "61 9 9933-7263", "celPai": "61 9 9805-1740", "turmaChave": "Maternal I::MARLENE"},
  {"firstName": "ISIS", "lastName": "AGUIAR DE SOUZA", "cpf": "118.942.631-54", "dateOfBirth": "2023-03-10T12:00:00.000Z", "gender": "FEMININO", "bloodType": null, "raca": "BRANCA", "peso": "10,1 KG", "emergencyContactName": "RAFAELA AGUIAR DOS SANTOS LIMA", "emergencyContactPhone": "61 9 9410-2144", "celPai": "61 9 9311-4168", "turmaChave": "Maternal II::ELENICE"},
  {"firstName": "ISIS", "lastName": "EDUARDA SANTOS VIANA", "cpf": "065.635.541-72", "dateOfBirth": "2024-04-01T12:00:00.000Z", "gender": "FEMININO", "bloodType": "A+", "raca": "PARDA", "peso": "10 KG", "emergencyContactName": "ANNA BEATRIZ DOS SANTOS SILVA", "emergencyContactPhone": "61 9 9682-4085", "celPai": "61 9 9504-7263", "turmaChave": "Berçário II::DÉBORA"},
  {"firstName": "ISIS", "lastName": "PEREIRA BARBOSA", "cpf": "068.548.931-00", "dateOfBirth": "2024-04-07T12:00:00.000Z", "gender": "FEMININO", "bloodType": "O+", "raca": "PRETA", "peso": "12 KG", "emergencyContactName": "WANESSA DA SILVA BARBOSA", "emergencyContactPhone": "61 9 9529-5886", "celPai": "61 9 9515-3267", "turmaChave": "Berçário II::CARLA"},
  {"firstName": "ÍSIS", "lastName": "SOPHIA ALVES DE SANTANA", "cpf": "120.588.321-59", "dateOfBirth": "2023-08-08T12:00:00.000Z", "gender": "FEMININO", "bloodType": "A+", "raca": "PARDA", "peso": "10 KG", "emergencyContactName": "SUZANNE DE SANTANA LIMA", "emergencyContactPhone": "61 9 9295-1233", "celPai": "61 9 9329-5875", "turmaChave": "Maternal I::NELCI"},
  {"firstName": "IZABELLA", "lastName": "ELOA MOURAO SOARES", "cpf": "116.127.151-17", "dateOfBirth": "2022-06-04T12:00:00.000Z", "gender": "FEMININO", "bloodType": "A+", "raca": "PARDA", "peso": "11 KG", "emergencyContactName": "VITORIA CANDIDA MOURAO SOARES", "emergencyContactPhone": "61 9 94613257", "celPai": "61 9 9391-2098", "turmaChave": "Maternal II::MARIA JUCELIA"},
  {"firstName": "JOAO", "lastName": "RAFAEL HENRIQUES DA SILVA", "cpf": "075.796.911-91", "dateOfBirth": "2024-04-22T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "B+", "raca": "BRANCA", "peso": "13 KG", "emergencyContactName": "PATRÍCIA DA SILVA LIMA", "emergencyContactPhone": "61 9 8237-7707", "celPai": "61 9 9556-1331", "turmaChave": "Berçário II::DÉBORA"},
  {"firstName": "JOÃO", "lastName": "VITOR LIMA RODRIGUES", "cpf": "119.693.661-76", "dateOfBirth": "2023-05-15T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "O-", "raca": "PARDA", "peso": null, "emergencyContactName": "CLEICIANE LIMA FRAZÃO", "emergencyContactPhone": "61 9 8318-2098", "celPai": null, "turmaChave": "Maternal I::MARLENE"},
  {"firstName": "JORDANA", "lastName": "FERREIRA DE LIMA", "cpf": "039.439.331-72", "dateOfBirth": "2024-01-22T12:00:00.000Z", "gender": "FEMININO", "bloodType": null, "raca": "BRANCA", "peso": null, "emergencyContactName": "CRISTINA FERREIRA AVILA", "emergencyContactPhone": null, "celPai": "61 9 9857-5500", "turmaChave": "Maternal I::MARLENE"},
  {"firstName": "JOSE", "lastName": "LEONARDO DIAS DA SILVA", "cpf": "127.875.481-48", "dateOfBirth": "2025-10-02T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "O+", "raca": "PRETA", "peso": "4,8 KG", "emergencyContactName": "TATIANA DIAS DOS SANTOS", "emergencyContactPhone": "61 9 9589-0661", "celPai": null, "turmaChave": "Berçário I::AMANDA"},
  {"firstName": "KALEB", "lastName": "HENRIQUE SOUZA NOVAK", "cpf": "117.455.671-43", "dateOfBirth": "2022-10-20T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "AB +", "raca": "BRANCA", "peso": "12 KG", "emergencyContactName": "FERNANDA SOUZA E SILVA", "emergencyContactPhone": "61 9 9657-3501", "celPai": "61 9 9198-9461", "turmaChave": "Maternal II::TATILA"},
  {"firstName": "KALEO", "lastName": "ALVES RIBEIRO", "cpf": "120.349.711-32", "dateOfBirth": "2023-07-15T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "A+", "raca": "PARDA", "peso": "15 KG", "emergencyContactName": "TALITA ALVES RIBEIRO", "emergencyContactPhone": "61 9 9528-5501", "celPai": "61 9 9156-2231", "turmaChave": "Maternal I::MARLENE"},
  {"firstName": "KALLEB", "lastName": "ESTRELA MACEDO", "cpf": "115.518.731-84", "dateOfBirth": "2022-04-07T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "O-", "raca": "PRETA", "peso": "25 KG", "emergencyContactName": "KATY ELLEN SILVA MACEDO", "emergencyContactPhone": "61 9 9124-6356", "celPai": "61 9 8128-1274", "turmaChave": "Maternal II::ELENICE"},
  {"firstName": "KLAUS", "lastName": "JEFFERSON BRAGA DA SILVA", "cpf": "121.161.991-58", "dateOfBirth": "2024-05-23T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "A+", "raca": "BRANCA", "peso": "11 KG", "emergencyContactName": "GISLENE TENÓRIO DE SOUZA BRAGA", "emergencyContactPhone": "61 9 9890-7415", "celPai": null, "turmaChave": "Berçário II::CARLA"},
  {"firstName": "KAUANY", "lastName": "GERMANO DE OLIVEIRA", "cpf": "121.734.7171-42", "dateOfBirth": "2024-07-06T12:00:00.000Z", "gender": "FEMININO", "bloodType": "O+", "raca": "PARDA", "peso": null, "emergencyContactName": "KAREN PRISCILLA FERMANO DE SOUSA", "emergencyContactPhone": "61 9 9299-3219", "celPai": "61 9 9283-9496", "turmaChave": "Berçário II::DÉBORA"},
  {"firstName": "KYARA", "lastName": "CECILIA PIRES FURTADO", "cpf": "117.641.481-00", "dateOfBirth": "2022-11-10T12:00:00.000Z", "gender": "FEMININO", "bloodType": "O+", "raca": "PRETA", "peso": "12 KG", "emergencyContactName": "MARJORIE PAOLLA  PIRES BARBOSA MOTA", "emergencyContactPhone": "61 9 8235-3323", "celPai": null, "turmaChave": "Maternal II::TATILA"},
  {"firstName": "LARA", "lastName": "SOFIA COSTA SILVA", "cpf": "118.282.381-55", "dateOfBirth": "2023-01-11T12:00:00.000Z", "gender": "FEMININO", "bloodType": null, "raca": "BRANCA", "peso": "13 KG", "emergencyContactName": "ANA PAULA COSTA DE SOUZA", "emergencyContactPhone": "61 9 8417-7360", "celPai": "64 9 9255-4337", "turmaChave": "Maternal II::TATILA"},
  {"firstName": "LAUANNY", "lastName": "VICTORIA SILVA DOS SANTOS", "cpf": "119.890.691-00", "dateOfBirth": "2023-06-05T12:00:00.000Z", "gender": "FEMININO", "bloodType": null, "raca": "PARDA", "peso": "8 KG", "emergencyContactName": "MAYNARA GLENDA SILVA SOUZA", "emergencyContactPhone": "61 9 9378-4047", "celPai": null, "turmaChave": "Maternal I::NELCI"},
  {"firstName": "LAURA", "lastName": "HELLENA DA SILVA COLOUNA", "cpf": "119.191.171-30", "dateOfBirth": "2023-04-02T12:00:00.000Z", "gender": "FEMININO", "bloodType": "B+", "raca": "PARDA", "peso": "8 KG", "emergencyContactName": "GIORDANNIA APARECIDA DA SILVA PIMENTEL", "emergencyContactPhone": "61 9 9849-7055", "celPai": "61 9 9126-5630", "turmaChave": "Maternal I::CÁTIA"},
  {"firstName": "LAURA", "lastName": "SANTANA ARAGAO", "cpf": "118.707.281-81", "dateOfBirth": "2023-02-13T12:00:00.000Z", "gender": "FEMININO", "bloodType": "A+", "raca": "PARDA", "peso": "14 KG", "emergencyContactName": "NAYARA SANTANA RIBEIRO", "emergencyContactPhone": "61 9 9141-2923", "celPai": null, "turmaChave": "Maternal II::TÁTILA"},
  {"firstName": "LAVINIA", "lastName": "CARDOSO RIBEIRO", "cpf": "122.254.701-54", "dateOfBirth": "2024-08-14T12:00:00.000Z", "gender": "FEMININO", "bloodType": "O+", "raca": "PARDA", "peso": "6,1 KG", "emergencyContactName": "MICHELLE REGINA CARDOSO DA SILVA", "emergencyContactPhone": "61 9 9258-7222", "celPai": "61 9 9835-9564", "turmaChave": "Berçário II::DÉBORA"},
  {"firstName": "LAYLLA", "lastName": "EVELLYN DE CHAVES SOUSA", "cpf": "124.240.503-84", "dateOfBirth": "2022-05-25T12:00:00.000Z", "gender": "FEMININO", "bloodType": "B+", "raca": "PARDA", "peso": null, "emergencyContactName": "FRANCISCA IARA CHAVES DA SILVA", "emergencyContactPhone": "61 9 9879-1497", "celPai": null, "turmaChave": "Maternal II::TATILA"},
  {"firstName": "LEONARDO", "lastName": "SANTOS DO NASCIMENTO TOLEDO", "cpf": "115.667.711-45", "dateOfBirth": "2022-04-24T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "O+", "raca": "PARDA", "peso": "14 KG", "emergencyContactName": "DANNYELLE SANTOS DO NASCIMENTO", "emergencyContactPhone": "61 9 8195-3484", "celPai": "61 9 8383-9020", "turmaChave": "Maternal II::ELENICE"},
  {"firstName": "LEVI", "lastName": "ANTHONY ALVES DE SOUSA", "cpf": "060.969.051-53", "dateOfBirth": "2024-03-14T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "O +", "raca": "PARDA", "peso": "12,1 KG", "emergencyContactName": "ANA CAROLINE DE SOUSA SANTOS", "emergencyContactPhone": "61 9 9505-4462", "celPai": null, "turmaChave": "Maternal I::CÁTIA"},
  {"firstName": "LEVI", "lastName": "BATISTA RODRIGUES DA SILVA", "cpf": "120.275.791-09", "dateOfBirth": "2023-07-08T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "A+", "raca": "PARDA", "peso": "11,5 KG", "emergencyContactName": "FABIANA BATISTA ANGOLA", "emergencyContactPhone": "61 9 9203-5714", "celPai": "61 9 9301-5876", "turmaChave": "Maternal I::CÁTIA"},
  {"firstName": "LEVY", "lastName": "DOS SANTOS SOUZA", "cpf": "119.331.831-95", "dateOfBirth": "2023-04-14T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "O+", "raca": "PARDA", "peso": "8,2 KG", "emergencyContactName": "ALAÍDE DOS SANTOS SOUZA", "emergencyContactPhone": "61 9 9976-6356", "celPai": null, "turmaChave": "Maternal I::MARLENE"},
  {"firstName": "LIS", "lastName": "EMANUELLY FERREIRA DE MELO", "cpf": "116.492.331-59", "dateOfBirth": "2022-06-20T12:00:00.000Z", "gender": "FEMININO", "bloodType": null, "raca": "PRETA", "peso": null, "emergencyContactName": "LUCILENE FERREIRA COELHO", "emergencyContactPhone": "61 9 8287-1461", "celPai": null, "turmaChave": "Maternal II::MARIA JUCELIA"},
  {"firstName": "LIVIA", "lastName": "DA GUARDA RESENDE", "cpf": "125.486.831-33", "dateOfBirth": "2025-04-14T12:00:00.000Z", "gender": "FEMININO", "bloodType": "O+", "raca": "PARDA", "peso": "11,0 KG", "emergencyContactName": "AMANDA RAFAELA DA GUARDA RESENDA", "emergencyContactPhone": "61 9 9179-4770", "celPai": "61  9 8122-9918", "turmaChave": "Berçário I::AMANDA"},
  {"firstName": "LIVIA", "lastName": "FERREIRA VIDAL", "cpf": "034.356.011-91", "dateOfBirth": "2024-01-05T12:00:00.000Z", "gender": "FEMININO", "bloodType": "O+", "raca": "PARDA", "peso": "11 KG", "emergencyContactName": "THAYANNE SILVA VIDAL", "emergencyContactPhone": "61 9 9340-0060", "celPai": "61 9 9690-2137", "turmaChave": "Maternal I::CÁTIA"},
  {"firstName": "LIZ", "lastName": "ADRIANO BARBOSA", "cpf": "118.024.121-58", "dateOfBirth": "2022-12-19T12:00:00.000Z", "gender": "FEMININO", "bloodType": "B+", "raca": "PARDA", "peso": "15,6 KG", "emergencyContactName": "LAYZA STEFANNY ADRIANO DA SILVA", "emergencyContactPhone": "61 9 9699-3444", "celPai": "61 9 8318-2224", "turmaChave": "Maternal II::ELENICE"},
  {"firstName": "LIZ", "lastName": "MORAIS DE ARAUJO", "cpf": "098.772.071-68", "dateOfBirth": "2024-05-14T12:00:00.000Z", "gender": "FEMININO", "bloodType": "B+", "raca": "BRANCA", "peso": "10,2 KG", "emergencyContactName": "LUANA MORAIS DE OLIVEIRA SILVA ARAÚJO", "emergencyContactPhone": "61 9 9132-9488", "celPai": "61 9 9157-0693", "turmaChave": "Berçário II::CARLA"},
  {"firstName": "LIZ", "lastName": "NASCIMENTO SANTOS MEDEIROS", "cpf": "119.990.271-32", "dateOfBirth": "2023-06-12T12:00:00.000Z", "gender": "FEMININO", "bloodType": "O+", "raca": "PARDA", "peso": "7,2 KG", "emergencyContactName": "CAROLINE NASCIMENTO DOS SANTOS", "emergencyContactPhone": "61 9 8608-9360", "celPai": "61 9 9466-3380", "turmaChave": "Maternal I::MARLENE"},
  {"firstName": "LIZ", "lastName": "RIBEIRO MEDEIROS", "cpf": "047.116.701-06", "dateOfBirth": "2024-02-12T12:00:00.000Z", "gender": "FEMININO", "bloodType": "A+", "raca": "PARDA", "peso": "9,6 KG", "emergencyContactName": "KATHLEEN CRISTINA RIBEIRO DE ALECRIM", "emergencyContactPhone": "61 9 9669-3804", "celPai": "61 9 9184-4725", "turmaChave": "Maternal I::CÁTIA"},
  {"firstName": "LORENA", "lastName": "PEREIRA DE JESUS", "cpf": "117.125.271-42", "dateOfBirth": "2022-09-13T12:00:00.000Z", "gender": "FEMININO", "bloodType": "A-", "raca": "PARDA", "peso": null, "emergencyContactName": "STEPHANIE ALVES DE JESUS", "emergencyContactPhone": "61 9 9687-2295", "celPai": "(38) 9 9979-7569", "turmaChave": "Maternal II::ELENICE"},
  {"firstName": "LORENA", "lastName": "SOUSA MARQUES BARRETO", "cpf": "121.030.611-52", "dateOfBirth": "2023-09-21T12:00:00.000Z", "gender": "FEMININO", "bloodType": "O+", "raca": "AMARELA", "peso": null, "emergencyContactName": "SIBELLE SOUSA MARQUES", "emergencyContactPhone": "61 9 8129-3679", "celPai": "61 9 8449-1864", "turmaChave": "Maternal I::NELCI"},
  {"firstName": "LORENZO", "lastName": "GOMES DE SOUZA", "cpf": "120.333.581-43", "dateOfBirth": "2023-07-14T12:00:00.000Z", "gender": "MASCULINO", "bloodType": null, "raca": "PARDA", "peso": null, "emergencyContactName": "KARINA GOMES DA SILVA", "emergencyContactPhone": "9643-2989", "celPai": "61 9 8169-0421", "turmaChave": "Maternal I::MARLENE"},
  {"firstName": "LORENZO", "lastName": "OLIVEIRA ARAUJO", "cpf": "125.811.161-61", "dateOfBirth": "2025-05-06T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "A+", "raca": "BRANCA", "peso": "9 KG", "emergencyContactName": "CLERIZETE DOS SANTOS OLIVEIRA", "emergencyContactPhone": "61 9 9832-4650", "celPai": "61 9 9921-7294", "turmaChave": "Berçário I::AMANDA"},
  {"firstName": "LORRANY", "lastName": "RODRIGUES PEREIRA", "cpf": "115.860.481-55", "dateOfBirth": "2022-05-09T12:00:00.000Z", "gender": "FEMININO", "bloodType": "AB+", "raca": "PARDA", "peso": "19,3 KG", "emergencyContactName": "MARCIA FLAVIA DA SILVA RODRIGUES", "emergencyContactPhone": "61 9 9639-1481", "celPai": "61 9 9206-3553", "turmaChave": "Maternal II::ELENICE"},
  {"firstName": "LUAN", "lastName": "DIAS DA SILVA", "cpf": "116.409.961-25", "dateOfBirth": "2022-07-02T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "A+", "raca": "PARDA", "peso": "12 KG", "emergencyContactName": "MARILEIDE JOSE DA SILVA", "emergencyContactPhone": "61 9 9185-0885", "celPai": "61 9 9514-3498", "turmaChave": "Maternal II::TATILA"},
  {"firstName": "LUIS", "lastName": "MIGUEL DE OLIVEIRA SILVA", "cpf": "122.263.071-09", "dateOfBirth": "2024-08-18T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "A+", "raca": "PARDA", "peso": "17 KG", "emergencyContactName": "INGRID LORRANY COSTA DE OLIVEIRA", "emergencyContactPhone": "61 9 9172-5090", "celPai": "61 9 9951-5082", "turmaChave": "Berçário II::DÉBORA"},
  {"firstName": "LUIZ", "lastName": "HENRIQUE DE OLIVEIRA", "cpf": "121.561.421-73", "dateOfBirth": "2024-06-23T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "O+", "raca": "PARDA", "peso": null, "emergencyContactName": "LUCIANA PINHEIRO DE OLIVEIRA", "emergencyContactPhone": "61 9 8360-8444", "celPai": null, "turmaChave": "Berçário II::CARLA"},
  {"firstName": "LUIZA", "lastName": "CANDIDA SANTOS DE CASTRO", "cpf": "120.811.371-27", "dateOfBirth": "2023-08-30T12:00:00.000Z", "gender": "FEMININO", "bloodType": "B+", "raca": "BRANCA", "peso": "6,8 KG", "emergencyContactName": "EDILENE RODRIGUES DOS SANTOS", "emergencyContactPhone": "61 9 9102-6659", "celPai": "61 9 9902-1651", "turmaChave": "Maternal I::MARLENE"},
  {"firstName": "LUNA", "lastName": "ANDRADE GUIMARAES", "cpf": "119.712.011-46", "dateOfBirth": "2023-05-17T12:00:00.000Z", "gender": "FEMININO", "bloodType": "O+", "raca": "PRETA", "peso": "12 KG", "emergencyContactName": "LARISSA RIBEIRO GUIMARÃES", "emergencyContactPhone": "61 9 9695-3095", "celPai": "61 9 9368-7743", "turmaChave": "Maternal I::MARLENE"},
  {"firstName": "MAITE", "lastName": "CAMPOS TEIXEIRA", "cpf": "125.223.281-07", "dateOfBirth": "2025-03-29T12:00:00.000Z", "gender": "FEMININO", "bloodType": "O+", "raca": "PARDA", "peso": "9,6 KG", "emergencyContactName": "ROGELMA CAMPOS MEIRELES", "emergencyContactPhone": "61 9 9191-1233", "celPai": "61 9 9118-1248", "turmaChave": "Berçário II::DÉBORA"},
  {"firstName": "MAITE", "lastName": "NATALLY LOPES MARTINS", "cpf": "117.011.811-93", "dateOfBirth": "2022-08-31T12:00:00.000Z", "gender": "FEMININO", "bloodType": null, "raca": "PARDA", "peso": null, "emergencyContactName": "LARYSSA GABRIELLE SANTIAGO MARTINS", "emergencyContactPhone": "61 9 8136-7150", "celPai": "61  9 9812-9259", "turmaChave": "Maternal II::ELENICE"},
  {"firstName": "MAITÊ", "lastName": "PONTES OLIVEIRA", "cpf": "125.330.431-92", "dateOfBirth": "2025-04-05T12:00:00.000Z", "gender": "FEMININO", "bloodType": "A+", "raca": "PARDA", "peso": "10 KG", "emergencyContactName": "ISABELY PONTES RIBEIRO", "emergencyContactPhone": "61  9 9163-4287", "celPai": "61 9 9195-1159", "turmaChave": "Berçário I::AMANDA"},
  {"firstName": "MAITE", "lastName": "ROCHA DA SILVA", "cpf": "117.867.631-50", "dateOfBirth": "2022-12-03T12:00:00.000Z", "gender": "FEMININO", "bloodType": "A+", "raca": "BRANCA", "peso": "15,9 KG", "emergencyContactName": "AGATHA ROCHA DE OLIVEIRA", "emergencyContactPhone": "61 9 8473-5107", "celPai": "61 9 8423-8120", "turmaChave": "Maternal II::MARIA JUCELIA"},
  {"firstName": "MAITÊ", "lastName": "RODRIGUES MORENO", "cpf": "119.995.701-11", "dateOfBirth": "2023-06-13T12:00:00.000Z", "gender": "FEMININO", "bloodType": "A+", "raca": "PARDA", "peso": null, "emergencyContactName": "ROSALI RODRIGUES DOS SANTOS", "emergencyContactPhone": "61 9 9573-1827", "celPai": "61 9 9256-3407", "turmaChave": "Maternal I::MARLENE"},
  {"firstName": "MAITE", "lastName": "VALENTINNA DE SOUSA VIEIRA", "cpf": "117.942.711-47", "dateOfBirth": "2022-12-10T12:00:00.000Z", "gender": "FEMININO", "bloodType": "A+", "raca": "BRANCA", "peso": "13 KG", "emergencyContactName": "NICOLE DE SOUSA BORGES", "emergencyContactPhone": "61 9 9927-5393", "celPai": null, "turmaChave": "Maternal II::TATILA"},
  {"firstName": "MANUELA", "lastName": "BOTELHO", "cpf": "075.789.381-34", "dateOfBirth": "2024-04-24T12:00:00.000Z", "gender": "FEMININO", "bloodType": "O+", "raca": "BRANCA", "peso": null, "emergencyContactName": "LARYSSA BOTELHO LIMA", "emergencyContactPhone": "61 9 9430-2398", "celPai": null, "turmaChave": "Berçário II::DÉBORA"},
  {"firstName": "MARCELO", "lastName": "HENRIQUE PEREIRA BARROS", "cpf": "126.238.201-71", "dateOfBirth": "2025-06-05T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "O+", "raca": "PARDA", "peso": "8,1 KG", "emergencyContactName": "SARA JENNIFER PEREIRA MORAES", "emergencyContactPhone": "61 9 8385-2113", "celPai": "61 9 8172-8574", "turmaChave": "Berçário I::AMANDA"},
  {"firstName": "MARIA", "lastName": "ALICIA DOS SANTOS SILVA", "cpf": "117.527.601-40", "dateOfBirth": "2022-10-29T12:00:00.000Z", "gender": "FEMININO", "bloodType": "A+", "raca": "PARDA", "peso": "12 KG", "emergencyContactName": "MARIA APARECIDA DA SILVA", "emergencyContactPhone": "61 9 9161-3177", "celPai": null, "turmaChave": "Maternal II::TATILA"},
  {"firstName": "MARIA", "lastName": "EDUARDA LEVINO DOS SANTOS CERES", "cpf": "120.765.061-79", "dateOfBirth": "2023-08-27T12:00:00.000Z", "gender": "FEMININO", "bloodType": "A+", "raca": "PRETA", "peso": "9,8 KG", "emergencyContactName": "HELEN BASILIO DOS SANTOS", "emergencyContactPhone": "61 9 8158-4839", "celPai": null, "turmaChave": "Maternal I::CÁTIA"},
  {"firstName": "MARIA", "lastName": "LIZ AMORIM DE CARVALHO DANIEL", "cpf": "116.681.911-64", "dateOfBirth": "2022-07-29T12:00:00.000Z", "gender": "FEMININO", "bloodType": "O+", "raca": "PARDA", "peso": "13 KG", "emergencyContactName": "GABRIELA TAYNAN DE CARVALHO DANIEL", "emergencyContactPhone": "61 9 9849-5948", "celPai": null, "turmaChave": "Maternal II::MARIA JUCELIA"},
  {"firstName": "MARIA", "lastName": "LUCIA DA SILVA BRITO", "cpf": "047.078.771-68", "dateOfBirth": "2024-02-11T12:00:00.000Z", "gender": "FEMININO", "bloodType": null, "raca": "BRANCA", "peso": "9 KG", "emergencyContactName": "THAIS ANTONIA TAVARES DA SILVA", "emergencyContactPhone": "61 9 8439-7825", "celPai": "61 9 8225-4349", "turmaChave": "Maternal I::CÁTIA"},
  {"firstName": "MARIA", "lastName": "RITA MENDES SOUSA", "cpf": "126.011.531-30", "dateOfBirth": "2025-05-22T12:00:00.000Z", "gender": "FEMININO", "bloodType": "O+", "raca": "BRANCA", "peso": "6,5 KG", "emergencyContactName": "LORENA FRANCISK MENDES DE LIMA", "emergencyContactPhone": "61 9 8100-8944", "celPai": "61 9 9220-4613", "turmaChave": "Berçário I::AMANDA"},
  {"firstName": "MARIA", "lastName": "VALENTINA DOS ANJOS DE OLIVEIRA", "cpf": "116.603.891-27", "dateOfBirth": "2022-07-20T12:00:00.000Z", "gender": "FEMININO", "bloodType": null, "raca": "BRANCA", "peso": "16 KG", "emergencyContactName": "PAMELA SANTOS DE OLIVEIRA", "emergencyContactPhone": "61 9 8170-8206", "celPai": null, "turmaChave": "Maternal II::MARIA JUCELIA"},
  {"firstName": "MARIAH", "lastName": "SILVA DO CARMO SANTOS", "cpf": "115.703.481-03", "dateOfBirth": "2022-04-24T12:00:00.000Z", "gender": "FEMININO", "bloodType": "O+", "raca": "BRANCA", "peso": "10 KG", "emergencyContactName": "ANNA LETICIA PEREIRA DA SILVA", "emergencyContactPhone": "61 9 9870-6685", "celPai": null, "turmaChave": "Maternal II::TATILA"},
  {"firstName": "MATHEO", "lastName": "RIBEIRO DOS SANTOS", "cpf": "102.832.851-68", "dateOfBirth": "2024-05-16T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "A+", "raca": "BRANCA", "peso": "9 KG", "emergencyContactName": "THAYNARA DOS SANTOS SILVA RIBEIRO", "emergencyContactPhone": "61 9 8663-8911", "celPai": "61 9 8623-1482", "turmaChave": "Berçário II::CARLA"},
  {"firstName": "MAYTE", "lastName": "FERREIRA DUTRA", "cpf": "118.078.711-00", "dateOfBirth": "2022-12-26T12:00:00.000Z", "gender": "FEMININO", "bloodType": "A+", "raca": "PARDA", "peso": "12 KG", "emergencyContactName": "LUARA FERREIRA DUTRA", "emergencyContactPhone": "61 9 9431-8236", "celPai": null, "turmaChave": "Maternal II::LUARA"},
  {"firstName": "MELINA", "lastName": "FERNANDES DA SILVA", "cpf": "119.192.161-11", "dateOfBirth": "2023-04-02T12:00:00.000Z", "gender": "FEMININO", "bloodType": "A+", "raca": "PARDA", "peso": null, "emergencyContactName": "GLEICIANE DA SILVA PEREIRA", "emergencyContactPhone": "61 9 8417-9865", "celPai": "61 9 8557-8551", "turmaChave": "Maternal I::CÁTIA"},
  {"firstName": "MELINA", "lastName": "PEREIRA MADEIRO", "cpf": "122.057.521-62", "dateOfBirth": "2024-08-01T12:00:00.000Z", "gender": "FEMININO", "bloodType": "O+", "raca": "PRETA", "peso": "11 KG", "emergencyContactName": "NICOLE SILVA PEREIRA", "emergencyContactPhone": "61 9 8117-5590", "celPai": "61 9 8209-5045", "turmaChave": "Berçário II::DÉBORA"},
  {"firstName": "MELINDA", "lastName": "FLORENCIO DE OLIVEIRA", "cpf": "116.774.471-33", "dateOfBirth": "2022-08-09T12:00:00.000Z", "gender": "FEMININO", "bloodType": "AB +", "raca": "PRETA", "peso": "10 KG", "emergencyContactName": "FABIANA ALMEIDA GOIS", "emergencyContactPhone": "61 98495-7989", "celPai": "61 9 9617-8084", "turmaChave": "Maternal II::TATILA"},
  {"firstName": "MIGUEL", "lastName": "DA SILVA PEREIRA", "cpf": "119.435.861-60", "dateOfBirth": "2023-04-24T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "A+", "raca": "PARDA", "peso": "9,9 KG", "emergencyContactName": "LETICIA PEREIRA DA SILVA", "emergencyContactPhone": "61 9 9664-4642", "celPai": "61 9 9577-3931", "turmaChave": "Maternal I::CÁTIA"},
  {"firstName": "MIRIA", "lastName": "FLORENCIO MOURA DA SILVA", "cpf": "121.900.931-80", "dateOfBirth": "2024-07-19T12:00:00.000Z", "gender": "FEMININO", "bloodType": "B+", "raca": "PARDA", "peso": "8 KG", "emergencyContactName": "FABIANA ALMEIDA GOIS", "emergencyContactPhone": "61 9 8495-7989", "celPai": "61 9 8635-0594", "turmaChave": "Berçário II::DÉBORA"},
  {"firstName": "MURILLO", "lastName": "ALVES DE OLIVEIRA", "cpf": "074.697.561-91", "dateOfBirth": "2024-04-20T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "A+", "raca": "PARDA", "peso": "10 KG", "emergencyContactName": "LAÊSSA ALVES DA MOTA", "emergencyContactPhone": "61 9 9552-2850", "celPai": "61 9 9133-9901", "turmaChave": "Berçário II::CARLA"},
  {"firstName": "MURILLO", "lastName": "RAVI SOARES DOS SANTOS", "cpf": "120.474.711-33", "dateOfBirth": "2023-07-27T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "A+", "raca": "PRETA", "peso": "11,2 KG", "emergencyContactName": "MAYLA CAROLINA SOARES DE SOUSA", "emergencyContactPhone": "61 9 8362-9172", "celPai": null, "turmaChave": "Maternal I::CÁTIA"},
  {"firstName": "MURILLO", "lastName": "SOUZA GOMES DA SILVA", "cpf": "120.317.961-86", "dateOfBirth": "2023-07-12T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "A+", "raca": "PARDA", "peso": "7,3 KG", "emergencyContactName": "MALRIZA ALVES DE SOUZA", "emergencyContactPhone": "61 9 8429-3397", "celPai": "61 9 8248-9049", "turmaChave": "Maternal I::NELCI"},
  {"firstName": "NATHANAEL", "lastName": "HENRIQUE PAIXAO DA SILVA", "cpf": "117.584.891-38", "dateOfBirth": "2022-11-04T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "B+", "raca": "PARDA", "peso": "10,4 KG", "emergencyContactName": "MARIA LUCIA FIGUEREDO DA SILVA", "emergencyContactPhone": "61 9 9380-4496", "celPai": "61 9 9301-6599", "turmaChave": "Maternal II::TATILA"},
  {"firstName": "NICOLAS", "lastName": "OLIVEIRA DIAS", "cpf": "052.042.595-20", "dateOfBirth": "2024-06-03T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "A+", "raca": "PARDA", "peso": "12 KG", "emergencyContactName": "ROZANGELA DE SOUZA OLIVEIRA", "emergencyContactPhone": "77 9 9951-5166", "celPai": "77 9 9852-9490", "turmaChave": "Berçário II::DÉBORA"},
  {"firstName": "NICOLAS", "lastName": "RODRIGUES FERNANDES", "cpf": "063.277.881-49", "dateOfBirth": "2024-03-21T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "A+", "raca": "BRANCA", "peso": "11 KG", "emergencyContactName": "LETICIA VITORIA DE SOUSA RODRIGUES", "emergencyContactPhone": "61 9 9263-7754", "celPai": "61 9 9956-5043", "turmaChave": "Maternal I::NELCI"},
  {"firstName": "NICOLLAS", "lastName": "CARDOSO RIBEIRO", "cpf": "122.254.221-84", "dateOfBirth": "2024-08-14T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "O+", "raca": "PARDA", "peso": "7,5 KG", "emergencyContactName": "MICHELLE REGINA CARDOSO DA SILVA", "emergencyContactPhone": "61 9 9258-7222", "celPai": "61 9 9835-9564", "turmaChave": "Berçário II::CARLA"},
  {"firstName": "NOAH", "lastName": "ANDRE ROSA SILVA RODRIGUES", "cpf": "117.074.511-33", "dateOfBirth": "2022-09-07T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "A+", "raca": "PARDA", "peso": "14,9 KG", "emergencyContactName": "BRUNA TAUANA DA SILVA RODRIGUES", "emergencyContactPhone": "61 9 8164-8891", "celPai": "61 9 9829-6341", "turmaChave": "Maternal II::ELENICE"},
  {"firstName": "NOAH", "lastName": "IURY SANTOS DE OLIVEIRA", "cpf": "124.323.111-40", "dateOfBirth": "2025-01-27T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "B+", "raca": "PARDA", "peso": "9 KG", "emergencyContactName": "DÉBORA SANTOS DIAS", "emergencyContactPhone": "61 9 9130-2916", "celPai": "61 9 9886-8491", "turmaChave": "Berçário II::DÉBORA"},
  {"firstName": "NOAH", "lastName": "LIMA PERES", "cpf": "117.698.931-64", "dateOfBirth": "2022-11-14T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "O+", "raca": "BRANCA", "peso": "23 KG", "emergencyContactName": "JESSIKA LIMA PERES", "emergencyContactPhone": "61 9 9166-4036", "celPai": "61 9 9226-6383", "turmaChave": "Maternal II::ELENICE"},
  {"firstName": "OLIVER", "lastName": "LEVI SILVA SAMPAIO", "cpf": "124.261.571-78", "dateOfBirth": "2025-01-22T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "O+", "raca": "PARDA", "peso": null, "emergencyContactName": "MÉRIEN JOSEELENE ARAUJO SAMPAIO", "emergencyContactPhone": "61 9 9660-4630", "celPai": "61 9 9434-3299", "turmaChave": "Berçário II::CARLA"},
  {"firstName": "PATRICIA", "lastName": "LAILA MENDONCA DOS SANTOS", "cpf": "117.686.851-93", "dateOfBirth": "2022-11-11T12:00:00.000Z", "gender": "FEMININO", "bloodType": null, "raca": "PARDA", "peso": "10 KG", "emergencyContactName": "FABIANA MENDONÇA DA SILVA", "emergencyContactPhone": "61 9 8170-8592", "celPai": "61 9 8170-8592", "turmaChave": "Maternal II::TATILA"},
  {"firstName": "PEDRO", "lastName": "ANTUNES ALVES OLIVEIRA DO LAGO", "cpf": "026.304.781-49", "dateOfBirth": "2023-12-01T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "A+", "raca": "PARDA", "peso": "12 KG", "emergencyContactName": "LARISSA ALVES DA SILVA DO LAGO", "emergencyContactPhone": "61 9 9181-5674", "celPai": "61 9 8326-3132", "turmaChave": "Maternal I::CÁTIA"},
  {"firstName": "PEDRO", "lastName": "HENRIQUE DA SILVA MIRANDA", "cpf": "115.473.891-41", "dateOfBirth": "2022-04-03T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "A+", "raca": null, "peso": "14 KG", "emergencyContactName": "ADINETE ROMANA DA SILVA", "emergencyContactPhone": "61 9 9625-2670", "celPai": "61 9 9629-3651", "turmaChave": "Maternal II::ELENICE"},
  {"firstName": "PEDRO", "lastName": "SALES SAMPAIO", "cpf": "125.506.601-61", "dateOfBirth": "2025-04-16T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "O+", "raca": "PARDA", "peso": "8,7 KG", "emergencyContactName": "SAMARA SALES OLIVEIRA", "emergencyContactPhone": "61 9 9363-1828", "celPai": "61 9 9571-3542", "turmaChave": "Berçário I::AMANDA"},
  {"firstName": "PEROLA", "lastName": "MUNIZ DA COSTA", "cpf": "122.538.441-95", "dateOfBirth": "2024-09-07T12:00:00.000Z", "gender": "FEMININO", "bloodType": "B+", "raca": "BRANCA", "peso": "10,3 KG", "emergencyContactName": "JESSICA MUNIZ DE OLIVEIRA", "emergencyContactPhone": "61 9 8158-5490", "celPai": "61 9 8194-2978", "turmaChave": "Berçário II::CARLA"},
  {"firstName": "PILAR", "lastName": "ANTONELLA NEVES OEIRAS", "cpf": "120.219.281-52", "dateOfBirth": "2023-07-04T12:00:00.000Z", "gender": "FEMININO", "bloodType": "O+", "raca": "PRETA", "peso": "15 KG", "emergencyContactName": "RAFAELA NEVES DO NASCIMENTO", "emergencyContactPhone": "61 9 8262-8604", "celPai": "61 9 9413-9685", "turmaChave": "Maternal I::NELCI"},
  {"firstName": "RAEL", "lastName": "PEREIRA SILVA MOREIRA", "cpf": "089.038.081-34", "dateOfBirth": "2024-05-01T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "A+", "raca": null, "peso": null, "emergencyContactName": "ALEXANDRA DOS SANTOS PEREIRA", "emergencyContactPhone": "61 9 9100-0844", "celPai": "61 9 9345-5227", "turmaChave": "Berçário II::AMANDA"},
  {"firstName": "RAGNAR", "lastName": "OLIVEIRA MILANEZ", "cpf": "117.146.881-43", "dateOfBirth": "2022-09-15T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "A+", "raca": "PARDA", "peso": "10 KG", "emergencyContactName": "EMILY LORRANE OLIVEIRA DA SILVA", "emergencyContactPhone": "61 9 9382-4747", "celPai": "61 9 8658-0312", "turmaChave": "Maternal II::MARIA JUCELIA"},
  {"firstName": "RAVI", "lastName": "LUCCA ALVES LUCENA", "cpf": "121.578.011-70", "dateOfBirth": "2024-06-23T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "O+", "raca": "PARDA", "peso": "8,7 KG", "emergencyContactName": "ANA CAROLINA ALVES DO NASCIMENTO", "emergencyContactPhone": "61 9 9229-1322", "celPai": null, "turmaChave": "Berçário II::DÉBORA"},
  {"firstName": "RAVI", "lastName": "MENDES SOUSA", "cpf": "117.386.191-25", "dateOfBirth": "2022-10-13T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "B+", "raca": "PARDA", "peso": "14 KG", "emergencyContactName": "LINA LUSTOSA MENDES", "emergencyContactPhone": "61 9 9349-3405", "celPai": "61 9 8483-1751", "turmaChave": "Maternal II::MARIA JUCELIA"},
  {"firstName": "RAVY", "lastName": "MIGUEL ALVES FRANCISCO", "cpf": "119.082.491-45", "dateOfBirth": "2023-03-22T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "AB +", "raca": "PARDA", "peso": "12 KG", "emergencyContactName": "VALLERY ALVES DA SILVA", "emergencyContactPhone": "61 9 8166-9610", "celPai": "61 9 9206-9816", "turmaChave": "Maternal II::MARIA JUCELIA"},
  {"firstName": "REBECA", "lastName": "PEREIRA DO SANTOS", "cpf": "118.024.081-26", "dateOfBirth": "2022-12-15T12:00:00.000Z", "gender": "FEMININO", "bloodType": "A+", "raca": "PARDA", "peso": "10,3 KG", "emergencyContactName": "ELIANE DOSA SANTOS SILVA", "emergencyContactPhone": "61 9 8654-0234", "celPai": "61 9 9151-0279", "turmaChave": "Maternal II::TATILA"},
  {"firstName": "RURY", "lastName": "LIRA ARAUJO", "cpf": "060.943.331-87", "dateOfBirth": "2024-03-18T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "O+", "raca": "PARDA", "peso": "14 KG", "emergencyContactName": "RAYCA RODRIGUES ARAUJO", "emergencyContactPhone": "61 9 8151-6464", "celPai": "61 9 9371-1397", "turmaChave": "Maternal I::CÁTIA"},
  {"firstName": "RYAN", "lastName": "LEVI SILVA DE JESUS", "cpf": "124.099.181-90", "dateOfBirth": "2025-01-13T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "O +", "raca": "PARDA", "peso": null, "emergencyContactName": "NAYANE CARNEIRO DE JESUS", "emergencyContactPhone": "61 9 8410-4573", "celPai": null, "turmaChave": "Berçário II::CARLA"},
  {"firstName": "RYAN", "lastName": "MIGUEL SANTIAGO SOUSA", "cpf": "117.360.411-18", "dateOfBirth": "2022-10-09T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "A+", "raca": "PARDA", "peso": "14 KG", "emergencyContactName": "THAYNNARA SANTIAGO DUARTE", "emergencyContactPhone": "61 9 9429-6914", "celPai": "61 9 9329-4476", "turmaChave": "Maternal II::ELENICE"},
  {"firstName": "SAMUEL", "lastName": "ALVES OLIVEIRA PROTASIO", "cpf": "117.454.681-61", "dateOfBirth": "2022-10-20T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "O+", "raca": "PARDA", "peso": null, "emergencyContactName": "KELLY ELAYANA OLIVEIRA PROTASIO", "emergencyContactPhone": "61 9 9311-8011", "celPai": "61 9 81998250", "turmaChave": "Maternal II::MARIA JUCELIA"},
  {"firstName": "SELENA", "lastName": "GOMES MORATO", "cpf": "031.654.261-04", "dateOfBirth": "2023-12-23T12:00:00.000Z", "gender": "FEMININO", "bloodType": "O+", "raca": "PARDA", "peso": "12 KG", "emergencyContactName": "ALLANE GOMES DA SILVA", "emergencyContactPhone": "61 9 9206-0498", "celPai": "61 9 9044-1488", "turmaChave": "Maternal I::CÁTIA"},
  {"firstName": "SERENA", "lastName": "AURORA SANTA CRUZ RIBEIRO", "cpf": "089.954.941-15", "dateOfBirth": "2024-05-06T12:00:00.000Z", "gender": "FEMININO", "bloodType": "O+", "raca": "PARDA", "peso": "11,5 KG", "emergencyContactName": "ESTER DE SOUSA SANTA CRUZ", "emergencyContactPhone": "61 9 9146-4973", "celPai": "61 9 9337-5890", "turmaChave": "Berçário II::DÉBORA"},
  {"firstName": "SOFIA", "lastName": "EMANUELLE SOUSA FEITOSA", "cpf": "089.812.211-20", "dateOfBirth": "2024-05-06T12:00:00.000Z", "gender": "FEMININO", "bloodType": "B+", "raca": "PRETA", "peso": null, "emergencyContactName": "VALDEJANE INACIO DE SOUSA", "emergencyContactPhone": "61 9 8103-4996", "celPai": null, "turmaChave": "Berçário II::CARLA"},
  {"firstName": "SOFIA", "lastName": "NASCIMENTO LIMA", "cpf": "119.930.531-66", "dateOfBirth": "2023-06-05T12:00:00.000Z", "gender": "FEMININO", "bloodType": null, "raca": "PARDA", "peso": null, "emergencyContactName": "SARAH FERREIRA DO NASCIMENTO", "emergencyContactPhone": "61 9 9190-9553", "celPai": "21 9 6544-6904", "turmaChave": "Maternal I::NELCI"},
  {"firstName": "STELLA", "lastName": "JESUS FREIRE", "cpf": "116.264.731-02", "dateOfBirth": "2022-06-17T12:00:00.000Z", "gender": "FEMININO", "bloodType": "B+", "raca": "PRETA", "peso": "13 KG", "emergencyContactName": "ELEONOR HENRIQUE BARBOSA FREIRE", "emergencyContactPhone": "61 9 9575-5636", "celPai": "61 9 9453-8774", "turmaChave": "Maternal II::MARIA JUCELIA"},
  {"firstName": "TACIANNY", "lastName": "DA HORA RODRIGUES", "cpf": "120.971.991-60", "dateOfBirth": "2023-09-15T12:00:00.000Z", "gender": "FEMININO", "bloodType": "O+", "raca": null, "peso": null, "emergencyContactName": "ROSÉLIA DE SOUSA RODRIGUES", "emergencyContactPhone": "61 9 9422-3797", "celPai": "61 9 8173-1004", "turmaChave": "Maternal I::CÁTIA"},
  {"firstName": "THEO", "lastName": "DANTAS GONCALVES", "cpf": "053.548.541-72", "dateOfBirth": "2024-03-03T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "O+", "raca": "PARDA", "peso": "11 KG", "emergencyContactName": "LETICIA DANTAS PEREIRA GONÇALVES", "emergencyContactPhone": "61 9 8263-7718", "celPai": "61 9 8241-1531", "turmaChave": "Maternal I::CÁTIA"},
  {"firstName": "THEO", "lastName": "GABRIEL DE SOUZA GUAJAJARA", "cpf": "119.247.631-09", "dateOfBirth": "2023-04-08T12:00:00.000Z", "gender": "MASCULINO", "bloodType": null, "raca": "PARDA", "peso": "9 KG", "emergencyContactName": "THAMYRES KATHELLEN DE SOUZA LIRA", "emergencyContactPhone": "61 9 8439-5185", "celPai": "61 9 9183-7675", "turmaChave": "Maternal I::MARLENE"},
  {"firstName": "THEO", "lastName": "VALENTIN RIBEIRO DOS SANTOS", "cpf": "115.840.431-05", "dateOfBirth": "2022-05-04T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "O+", "raca": "PARDA", "peso": "14,2 KG", "emergencyContactName": "KENIA RIBEIRO DA SILVA", "emergencyContactPhone": "61 9 9297-9539", "celPai": "61 9 8635-4270", "turmaChave": "Maternal II::MARIA JUCELIA"},
  {"firstName": "THEO", "lastName": "YOHAN ALVES DE FREITAS", "cpf": "117.327.051-51", "dateOfBirth": "2022-10-05T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "O+", "raca": "BRANCA", "peso": "10 KG", "emergencyContactName": "RAQUEL ALVES DE SOUSA", "emergencyContactPhone": "61 9 8548-4396", "celPai": null, "turmaChave": "Maternal II::TATILA"},
  {"firstName": "URIEL", "lastName": "DA SILVA LEANDRO", "cpf": "120.304.231-06", "dateOfBirth": "2023-06-27T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "A+", "raca": "PARDA", "peso": "16 KG", "emergencyContactName": "ELÍ EURIDES DA SILVA", "emergencyContactPhone": "61 9 9273-6146", "celPai": null, "turmaChave": "Maternal I::CÁTIA"},
  {"firstName": "YARA", "lastName": "KATHLEEN SANTOS MOTA", "cpf": "117.474.361-19", "dateOfBirth": "2022-10-24T12:00:00.000Z", "gender": "FEMININO", "bloodType": "A+", "raca": "BRANCA", "peso": "12 KG", "emergencyContactName": "DEBORA RAYANE SANTOS MOTA", "emergencyContactPhone": "61  9 9331-1956", "celPai": "61 9 9405-4837", "turmaChave": "Maternal II::TATILA"},
  {"firstName": "YASMIN", "lastName": "ELOAH DIAS DE CARVALHO", "cpf": "122.652.691-82", "dateOfBirth": "2024-09-16T12:00:00.000Z", "gender": "FEMININO", "bloodType": "O+", "raca": "PARDA", "peso": "5,8 KG", "emergencyContactName": "ANA JÚLIA DIAS DE CARVALHO", "emergencyContactPhone": "61 9 8188-9414", "celPai": null, "turmaChave": "Berçário II::DÉBORA"},
  {"firstName": "YASMIN", "lastName": "KIMBERLY OLIVEIRA DOS SANTOS", "cpf": "125.404.101-03", "dateOfBirth": "2025-04-09T12:00:00.000Z", "gender": "FEMININO", "bloodType": "A+", "raca": null, "peso": "10 KG", "emergencyContactName": "MARIA ELBA GOMES DOS SANTOS", "emergencyContactPhone": "61 9 8551-0304", "celPai": "61 9 8401-4371", "turmaChave": "Berçário I::AMANDA"},
  {"firstName": "YASMIN", "lastName": "LOPES SIQUEIRA", "cpf": "126.817.931-06", "dateOfBirth": "2025-07-17T12:00:00.000Z", "gender": "FEMININO", "bloodType": "B+", "raca": "PARDA", "peso": "5,9 KG", "emergencyContactName": "MARIA CRUZ LOPES SIQUEIRA", "emergencyContactPhone": "61 9 8369-2581", "celPai": "61 9 8340-2104", "turmaChave": "Berçário I::AMANDA"},
  {"firstName": "YSABELLI", "lastName": "LOPES SIQUEIRA", "cpf": "126.817.881-02", "dateOfBirth": "2025-07-17T12:00:00.000Z", "gender": "FEMININO", "bloodType": "B+", "raca": "PARDA", "peso": "6,6 KG", "emergencyContactName": "MARIA CRUZ LOPES SIQUEIRA", "emergencyContactPhone": "61 9 8369-2581", "celPai": "61 9 8340-2104", "turmaChave": "Berçário I::AMANDA"},
  {"firstName": "YSAK", "lastName": "BARBOSA DE ANDRADE", "cpf": "124.184.991-97", "dateOfBirth": "2025-01-20T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "O+", "raca": "BRANCA", "peso": "8,6KG", "emergencyContactName": "MARLUCE BARBOSA DA SILVA", "emergencyContactPhone": "61 9 8629-5795", "celPai": "61 9 9695-9953", "turmaChave": "Berçário II::DÉBORA"},
  {"firstName": "YURI", "lastName": "JEOVA OLIVEIRA CUNHA", "cpf": "118.934.871-30", "dateOfBirth": "2023-03-09T12:00:00.000Z", "gender": "MASCULINO", "bloodType": null, "raca": "PARDA", "peso": null, "emergencyContactName": "ANA CLAUDIA DE OLIVEIRA SILVA", "emergencyContactPhone": "61 9 8497-7621", "celPai": "61 9 8110-7319", "turmaChave": "Maternal II::ELENICE"},
  {"firstName": "ZYON", "lastName": "PEREIRA REGO", "cpf": "116.184.911-48", "dateOfBirth": "2022-06-02T12:00:00.000Z", "gender": "MASCULINO", "bloodType": "A+", "raca": "PRETA", "peso": null, "emergencyContactName": "ARIELY DA CONCEIÇÃO", "emergencyContactPhone": "61 9 9520-0252", "celPai": null, "turmaChave": "Maternal II::TATILA"},
];

const PROFISSIONAIS = [
  {"firstName": "AMANDA", "lastName": "CARDOSO CUNHA", "email": "amandhacardoso1994@gmail.com", "phone": "61 8150-0558", "roleLevel": "PROFESSOR", "roleId": "cmlw6nyjl00097yvu0gf3ecdn", "primeiroNome": "AMANDA"},
  {"firstName": "BRUNA", "lastName": "PIRES LEITE DE OLIVEIRA", "email": "brunapires.nutri@gmail.com", "phone": "61 9399-0895", "roleLevel": "UNIDADE", "roleId": "cmmebm0ix000s10r9xauj2imk", "primeiroNome": "BRUNA"},
  {"firstName": "CARLA", "lastName": "CRISTINA SOARES SANTOS", "email": "carlacristina378@gmail.com", "phone": "61 8161-3064", "roleLevel": "PROFESSOR", "roleId": "cmlw6nyjl00097yvu0gf3ecdn", "primeiroNome": "CARLA"},
  {"firstName": "CATIA", "lastName": "SOUSA RODRIGUES", "email": "catiapessoa0530@gmail.com", "phone": "61 9648-7931", "roleLevel": "PROFESSOR", "roleId": "cmlw6nyjl00097yvu0gf3ecdn", "primeiroNome": "CATIA"},
  {"firstName": "DEBORA", "lastName": "SILVA VIDAL", "email": "ds411698@gmail.com", "phone": "61 9340-0333", "roleLevel": "PROFESSOR", "roleId": "cmlw6nyjl00097yvu0gf3ecdn", "primeiroNome": "DEBORA"},
  {"firstName": "ELAINE", "lastName": "ALVES DE CARVALHO NASCIMENTO", "email": "naninhadf2012@gmail.com", "phone": "61 9631-8259", "roleLevel": "PROFESSOR", "roleId": "cmlw6nyjl00097yvu0gf3ecdn", "primeiroNome": "ELAINE"},
  {"firstName": "ELENICE", "lastName": "BISPO DA VITORIA", "email": "elenicebispo.563@gmail.com", "phone": "61 9132-0564", "roleLevel": "PROFESSOR", "roleId": "cmlw6nyjl00097yvu0gf3ecdn", "primeiroNome": "ELENICE"},
  {"firstName": "FERNANDA", "lastName": "BARBOSA DUTRA SILVA", "email": "fernandab.silva1606@gmail.com", "phone": "61 9119-4738", "roleLevel": "PROFESSOR", "roleId": "cmlw6nyjl00097yvu0gf3ecdn", "primeiroNome": "FERNANDA"},
  {"firstName": "FLÁVIA", "lastName": "RAPHAELY DE SOUZA", "email": "flavia.raphaely@hotmail.com", "phone": "65 9669-6494", "roleLevel": "UNIDADE", "roleId": "cmlw6nyji00077yvuv2sxlsdq", "primeiroNome": "FLÁVIA"},
  {"firstName": "GIOVANA", "lastName": "DE ARAUJO MENDONÇA", "email": "giiooaraujoomend@gmail.com", "phone": "61 8429-1452", "roleLevel": "PROFESSOR", "roleId": "cmlw6nyjl00097yvu0gf3ecdn", "primeiroNome": "GIOVANA"},
  {"firstName": "GRACYELLE", "lastName": "DUTRA DOS SANTOS", "email": "graacy.dutra@gmail.com", "phone": "61 9433-4777", "roleLevel": "PROFESSOR", "roleId": "cmlw6nyjl00097yvu0gf3ecdn", "primeiroNome": "GRACYELLE"},
  {"firstName": "JAYANE", "lastName": "YASMIM FERREIRA", "email": "jayaneyasmim822@gmail.com", "phone": "61 9153-2449", "roleLevel": "PROFESSOR", "roleId": "cmlw6nyjl00097yvu0gf3ecdn", "primeiroNome": "JAYANE"},
  {"firstName": "JESSICA", "lastName": "FERREIRA BASTOS", "email": "jessicafbastos@hotmail.com", "phone": "61 9258-5979", "roleLevel": "PROFESSOR", "roleId": "cmlw6nyjl00097yvu0gf3ecdn", "primeiroNome": "JESSICA"},
  {"firstName": "JOANA", "lastName": "DARCK ALVES ROCHA BARBOSA", "email": "darckrocha@gmail.com", "phone": "61 9687-0471", "roleLevel": "PROFESSOR", "roleId": "cmlw6nyjl00097yvu0gf3ecdn", "primeiroNome": "JOANA"},
  {"firstName": "JOYCE", "lastName": "GABRIELLY DA COSTA LIRA", "email": "joyceudgg77284@gmail.com", "phone": "61 8214-2462", "roleLevel": "PROFESSOR", "roleId": "cmlw6nyjl00097yvu0gf3ecdn", "primeiroNome": "JOYCE"},
  {"firstName": "KAUANY", "lastName": "STHEFANY DA SILVA SOUSA", "email": "kauannysthefany75@gmail.com", "phone": "61 8208-0211", "roleLevel": "PROFESSOR", "roleId": "cmlw6nyjl00097yvu0gf3ecdn", "primeiroNome": "KAUANY"},
  {"firstName": "MARIA", "lastName": "CAROLINE DA SILVA", "email": "mariaexp157842@gmail.com", "phone": "61 9869-5137", "roleLevel": "PROFESSOR", "roleId": "cmlw6nyjl00097yvu0gf3ecdn", "primeiroNome": "MARIA"},
  {"firstName": "MARIA", "lastName": "DE FATIMA DAS NEVES SANTOS", "email": "fatinha.cord21@gmail.com", "phone": "61 9961-1327", "roleLevel": "UNIDADE", "roleId": "cmlw6nyji00077yvuv2sxlsdq", "primeiroNome": "MARIA"},
  {"firstName": "MARIA", "lastName": "JUCELIA RIBEIRO DE CASTRO", "email": "mariajucelia1980@gmail.com", "phone": "61 9242-0986", "roleLevel": "PROFESSOR", "roleId": "cmlw6nyjl00097yvu0gf3ecdn", "primeiroNome": "MARIA"},
  {"firstName": "MARINEIDE", "lastName": "DE SENE E SOUZA SANTOS", "email": "mara08_@hotmail.com", "phone": "61 8432-5428", "roleLevel": "PROFESSOR", "roleId": "cmlw6nyjl00097yvu0gf3ecdn", "primeiroNome": "MARINEIDE"},
  {"firstName": "MARLENE", "lastName": "DE ALMEIDA FARIA", "email": "marlenemarlenemkm@gmail.com", "phone": "61 9813-8068", "roleLevel": "PROFESSOR", "roleId": "cmlw6nyjl00097yvu0gf3ecdn", "primeiroNome": "MARLENE"},
  {"firstName": "MILLENA", "lastName": "RIBEIRO DE ALMEIDA", "email": "milena_1ribeiro@icloud.com", "phone": "61 9180-5478", "roleLevel": "PROFESSOR", "roleId": "cmlw6nyjl00097yvu0gf3ecdn", "primeiroNome": "MILLENA"},
  {"firstName": "NELCI", "lastName": "ROSA MARINHO", "email": "rosamarinho229@gmail.com", "phone": "61 8439-0281", "roleLevel": "PROFESSOR", "roleId": "cmlw6nyjl00097yvu0gf3ecdn", "primeiroNome": "NELCI"},
  {"firstName": "PATRICIA", "lastName": "TOMAZ GOMES", "email": "patricia.tgb.pb@gmail.com", "phone": "61 9569-5018", "roleLevel": "PROFESSOR", "roleId": "cmlw6nyjl00097yvu0gf3ecdn", "primeiroNome": "PATRICIA"},
  {"firstName": "PEDRO", "lastName": "PAULO ALVES DE SANTANA", "email": "ppasantana@gmail.com", "phone": "61 9156-9134", "roleLevel": "UNIDADE", "roleId": "cmmebkutl000j10r9aoteojhf", "primeiroNome": "PEDRO"},
  {"firstName": "RAIANE", "lastName": "PEREIRA DOS SANTOS", "email": "rayane.raypereira@gmail.com", "phone": "61 9522-1159", "roleLevel": "PROFESSOR", "roleId": "cmlw6nyjl00097yvu0gf3ecdn", "primeiroNome": "RAIANE"},
  {"firstName": "RIKSON", "lastName": "DOS SANTOS DA SILVA DUTRA", "email": "riksondutra@gmail.com", "phone": "61 9597-3875", "roleLevel": "UNIDADE", "roleId": "cmlw6nyji00077yvuv2sxlsdq", "primeiroNome": "RIKSON"},
  {"firstName": "SHERON", "lastName": "FERREIRA LIMA", "email": "sheronferreira14@gmail.com", "phone": "61 8587-2444", "roleLevel": "PROFESSOR", "roleId": "cmlw6nyjl00097yvu0gf3ecdn", "primeiroNome": "SHERON"},
  {"firstName": "TÁTILA", "lastName": "MICHELE DE OLIVEIRA COSTA", "email": "tatilamichele88@gmail.com", "phone": "61 9842-4436", "roleLevel": "PROFESSOR", "roleId": "cmlw6nyjl00097yvu0gf3ecdn", "primeiroNome": "TÁTILA"},
  {"firstName": "YSLANE", "lastName": "GALENO DA COSTA", "email": "yslane.galeno@gmail.com", "phone": "61 8346-5272", "roleLevel": "PROFESSOR", "roleId": "cmlw6nyjl00097yvu0gf3ecdn", "primeiroNome": "YSLANE"},
];
async function main() {
  console.log('\n🚀 Seed CEPI Sabiá do Campo\n');

  const senhaHash = await bcrypt.hash(SENHA_PADRAO, 10);

  // 1. Criar turmas
  console.log('── Turmas ──');
  const turmaMap = new Map<string, string>();
  for (let i = 0; i < TURMAS.length; i++) {
    const t = TURMAS[i];
    const chave = TURMA_CHAVES[i];
    const classroom = await prisma.classroom.upsert({
      where: { unitId_code: { unitId: UNIT_ID, code: t.code } },
      create: {
        unitId: UNIT_ID,
        name: t.name,
        code: t.code,
        ageGroupMin: t.ageGroupMin,
        ageGroupMax: t.ageGroupMax,
        capacity: 30,
        isActive: true,
        createdBy: 'seed-sabia',
      },
      update: {},
    });
    turmaMap.set(chave, classroom.id);
    console.log(`  ✅ ${t.name}`);
  }

  // 2. Criar alunos
  console.log('\n── Alunos ──');
  let criados = 0, erros = 0;
  for (const a of ALUNOS) {
    try {
      const classroomId = turmaMap.get(a.turmaChave);
      if (!classroomId) { erros++; continue; }

      const child = await prisma.child.upsert({
        where: { cpf: a.cpf },
        create: {
          mantenedoraId: MANTENEDORA_ID,
          unitId: UNIT_ID,
          firstName: a.firstName,
          lastName: a.lastName,
          cpf: a.cpf,
          dateOfBirth: new Date(a.dateOfBirth),
          gender: a.gender as any,
          bloodType: a.bloodType,
          raca: a.raca,
          peso: a.peso,
          emergencyContactName: a.emergencyContactName,
          emergencyContactPhone: a.emergencyContactPhone,
          celPai: a.celPai,
          isActive: true,
          createdBy: 'seed-sabia',
          updatedBy: 'seed-sabia',
        },
        update: {
          firstName: a.firstName,
          lastName: a.lastName,
          dateOfBirth: new Date(a.dateOfBirth),
          updatedBy: 'seed-sabia',
        },
      });

      await prisma.enrollment.upsert({
        where: { childId_classroomId: { childId: child.id, classroomId } },
        create: {
          childId: child.id,
          classroomId,
          enrollmentDate: new Date(),
          status: 'ATIVA',
          createdBy: 'seed-sabia',
        },
        update: { status: 'ATIVA' },
      });

      criados++;
    } catch(e: any) {
      console.error(`  ❌ ${a.firstName} ${a.lastName}: ${e.message}`);
      erros++;
    }
  }
  console.log(`  ✅ ${criados} alunos importados, ${erros} erros`);

  // 3. Criar profissionais
  console.log('\n── Profissionais ──');
  let users = 0;
  for (const p of PROFISSIONAIS) {
    try {
      const user = await prisma.user.upsert({
        where: { email: p.email },
        create: {
          mantenedoraId: MANTENEDORA_ID,
          unitId: UNIT_ID,
          email: p.email,
          password: senhaHash,
          firstName: p.firstName,
          lastName: p.lastName,
          phone: p.phone,
          status: 'ATIVO',
          createdBy: 'seed-sabia',
          updatedBy: 'seed-sabia',
        },
        update: { firstName: p.firstName, lastName: p.lastName },
      });

      const existing = await prisma.userRole.findUnique({
        where: { userId_roleId: { userId: user.id, roleId: p.roleId } },
      });
      if (!existing) {
        await prisma.userRole.create({
          data: {
            userId: user.id,
            roleId: p.roleId,
            scopeLevel: p.roleLevel as RoleLevel,
            isActive: true,
          },
        });
      }

      // Vincular professor à turma
      if (p.roleLevel === 'PROFESSOR') {
        for (const [chave, classroomId] of turmaMap) {
          const profDaTurma = chave.split('::')[1];
          if (profDaTurma.startsWith(p.primeiroNome)) {
            await prisma.classroomTeacher.upsert({
              where: { classroomId_teacherId: { classroomId, teacherId: user.id } },
              create: { classroomId, teacherId: user.id, role: 'MAIN', isActive: true },
              update: { isActive: true },
            });
          }
        }
      }

      console.log(`  ✅ ${p.firstName} ${p.lastName} (${p.roleLevel})`);
      users++;
    } catch(e: any) {
      console.error(`  ❌ ${p.firstName}: ${e.message}`);
    }
  }
  console.log(`\n  ✅ ${users} profissionais importados`);
  console.log('\n🎉 Seed concluído!');
  console.log(`📌 Senha padrão: ${SENHA_PADRAO}\n`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
