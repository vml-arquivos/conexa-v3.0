import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const UNIT_ID        = 'unit-arara-caninde';
const MANTENEDORA_ID = 'mant-cocris-001';

const TURMAS: any[] = [
  {"code": "BERCARIO-II-B-JESSICA", "name": "Berçário II B — Jessica", "ageGroupMin": 13, "ageGroupMax": 18},
  {"code": "BERCARIO-II-A-ELISANGELA", "name": "Berçário II A — Elisangela", "ageGroupMin": 13, "ageGroupMax": 18},
  {"code": "MATERNAL-I-A-LUCIENE", "name": "Maternal I A — Luciene", "ageGroupMin": 19, "ageGroupMax": 47},
  {"code": "MATERNAL-I-B-ANA", "name": "Maternal I B — Ana", "ageGroupMin": 19, "ageGroupMax": 47},
  {"code": "MATERNAL-I-C-EDILVANA", "name": "Maternal I C — Edilvana", "ageGroupMin": 19, "ageGroupMax": 47},
  {"code": "MATERNAL-II-A-RAQUEL", "name": "Maternal II A — Raquel", "ageGroupMin": 48, "ageGroupMax": 71},
  {"code": "MATERNAL-II-C-EVELLYN", "name": "Maternal II C — Evellyn", "ageGroupMin": 48, "ageGroupMax": 71},
  {"code": "MATERNAL-II-B-ANGELICA", "name": "Maternal II B — Angelica", "ageGroupMin": 48, "ageGroupMax": 71},
  {"code": "BERCARIO-I-NONATA", "name": "Berçário I — Nonata", "ageGroupMin": 0, "ageGroupMax": 12},
];

const ALUNOS: any[] = [
  {"firstName": "ADAN", "lastName": "KHALIL GEMAQUE MARIA", "cpf": null, "codigoAluno": "1253192", "inscricao": "244561", "dateOfBirth": "2024-05-09T12:00:00.000Z", "gender": "MASCULINO", "raca": "preta", "turmaCode": "BERCARIO-II-B-JESSICA"},
  {"firstName": "ANA", "lastName": "LIZ SANTANA ARAUJO", "cpf": null, "codigoAluno": "1305918", "inscricao": "269190", "dateOfBirth": "2024-07-19T12:00:00.000Z", "gender": "MASCULINO", "raca": null, "turmaCode": "BERCARIO-II-A-ELISANGELA"},
  {"firstName": "ANTHONY", "lastName": "BATISTA PEREIRA BRITO", "cpf": null, "codigoAluno": "1309063", "inscricao": "271942", "dateOfBirth": "2024-06-12T12:00:00.000Z", "gender": "MASCULINO", "raca": null, "turmaCode": "BERCARIO-II-A-ELISANGELA"},
  {"firstName": "AUGUSTO", "lastName": "MACHADO DE SOUSA", "cpf": null, "codigoAluno": "1269192", "inscricao": "251674", "dateOfBirth": "2024-09-25T12:00:00.000Z", "gender": "MASCULINO", "raca": "branco", "turmaCode": "BERCARIO-II-A-ELISANGELA"},
  {"firstName": "AURORA", "lastName": "BASTOS DE OLIVEIRA", "cpf": null, "codigoAluno": "1255925", "inscricao": "246928", "dateOfBirth": "2024-05-23T12:00:00.000Z", "gender": "FEMININO", "raca": "branco", "turmaCode": "BERCARIO-II-A-ELISANGELA"},
  {"firstName": "AURORA", "lastName": "RODRIGUES LOBATO", "cpf": null, "codigoAluno": "1255799", "inscricao": "246837", "dateOfBirth": "2024-05-16T12:00:00.000Z", "gender": "FEMININO", "raca": "branca", "turmaCode": "BERCARIO-II-A-ELISANGELA"},
  {"firstName": "AURORA", "lastName": "OLIVEIRA DA SILVA", "cpf": null, "codigoAluno": "1284502", "inscricao": "256225", "dateOfBirth": "2024-08-21T12:00:00.000Z", "gender": "MASCULINO", "raca": null, "turmaCode": "BERCARIO-II-B-JESSICA"},
  {"firstName": "AYLA", "lastName": "OLIVEIRA ARAÚJO", "cpf": null, "codigoAluno": "1257051", "inscricao": "247954", "dateOfBirth": "2024-04-16T12:00:00.000Z", "gender": "FEMININO", "raca": "branca", "turmaCode": "BERCARIO-II-B-JESSICA"},
  {"firstName": "HADASSA", "lastName": "POMPEU RANGEL", "cpf": null, "codigoAluno": "1299357", "inscricao": "264569", "dateOfBirth": "2024-11-11T12:00:00.000Z", "gender": "FEMININO", "raca": null, "turmaCode": "BERCARIO-II-B-JESSICA"},
  {"firstName": "HEITOR", "lastName": "MOURA CUSTÓDIO", "cpf": null, "codigoAluno": "1254945", "inscricao": "246068", "dateOfBirth": "2024-08-01T12:00:00.000Z", "gender": "MASCULINO", "raca": "parda", "turmaCode": "BERCARIO-II-B-JESSICA"},
  {"firstName": "BRYAN", "lastName": "HENRIQUE SANTOS DA SILVA", "cpf": null, "codigoAluno": "1299122", "inscricao": "264431", "dateOfBirth": "2024-11-16T12:00:00.000Z", "gender": "MASCULINO", "raca": null, "turmaCode": "BERCARIO-II-A-ELISANGELA"},
  {"firstName": "DAVI", "lastName": "LUCCA DE OLIVEIRA VITAL", "cpf": null, "codigoAluno": "1292797", "inscricao": "260620", "dateOfBirth": "2024-10-03T12:00:00.000Z", "gender": "MASCULINO", "raca": null, "turmaCode": "BERCARIO-II-A-ELISANGELA"},
  {"firstName": "ISIS", "lastName": "RIBEIRO FRANCO", "cpf": "9027270104.0", "codigoAluno": "1247011", "inscricao": "239927", "dateOfBirth": "2024-05-06T12:00:00.000Z", "gender": "FEMININO", "raca": "parda", "turmaCode": "BERCARIO-II-A-ELISANGELA"},
  {"firstName": "ISABELLY", "lastName": "PEREIRA DOS SANTOS NORONHA", "cpf": null, "codigoAluno": "1303558", "inscricao": "267297", "dateOfBirth": "2025-02-09T12:00:00.000Z", "gender": "FEMININO", "raca": null, "turmaCode": "BERCARIO-II-B-JESSICA"},
  {"firstName": "JOAO", "lastName": "HENRIQUE DA SILVA SANTIAGO", "cpf": null, "codigoAluno": "1287742", "inscricao": "257847", "dateOfBirth": "2024-12-15T12:00:00.000Z", "gender": "MASCULINO", "raca": null, "turmaCode": "BERCARIO-II-B-JESSICA"},
  {"firstName": "JOSE", "lastName": "BENICIO NASCIMENTO OLIVEIRA", "cpf": null, "codigoAluno": "1311474", "inscricao": "274194", "dateOfBirth": "2024-10-22T12:00:00.000Z", "gender": "FEMININO", "raca": null, "turmaCode": "BERCARIO-II-A-ELISANGELA"},
  {"firstName": "AGATHA", "lastName": "VITORIA DOS SANTOS SALES", "cpf": null, "codigoAluno": "1241053", "inscricao": "237097", "dateOfBirth": "2023-08-01T12:00:00.000Z", "gender": "FEMININO", "raca": "branca", "turmaCode": "MATERNAL-I-A-LUCIENE"},
  {"firstName": "ALLYCIA", "lastName": "ALVES DE OLIVEIRA", "cpf": null, "codigoAluno": "1247551", "inscricao": "240228", "dateOfBirth": "2024-02-17T12:00:00.000Z", "gender": "FEMININO", "raca": "preta", "turmaCode": "MATERNAL-I-A-LUCIENE"},
  {"firstName": "ADRYAN", "lastName": "LUCCA MORENO DE JESUS", "cpf": null, "codigoAluno": "1201135", "inscricao": "222873", "dateOfBirth": "2023-05-07T12:00:00.000Z", "gender": "MASCULINO", "raca": "parda", "turmaCode": "MATERNAL-I-B-ANA"},
  {"firstName": "ALICE", "lastName": "DOS ANJOS RODRIGUES", "cpf": null, "codigoAluno": "1256431", "inscricao": "247369", "dateOfBirth": "2024-03-06T12:00:00.000Z", "gender": "FEMININO", "raca": "parda", "turmaCode": "MATERNAL-I-C-EDILVANA"},
  {"firstName": "ANTHONY", "lastName": "ADRIANO PAES PAULINO DA SILVA", "cpf": null, "codigoAluno": "1218607", "inscricao": "227621", "dateOfBirth": "2023-05-14T12:00:00.000Z", "gender": "MASCULINO", "raca": null, "turmaCode": "MATERNAL-I-A-LUCIENE"},
  {"firstName": "ARTHUR", "lastName": "CAVALHEIRO MIRANDA", "cpf": null, "codigoAluno": "1238531", "inscricao": "235469", "dateOfBirth": "2023-05-26T12:00:00.000Z", "gender": "MASCULINO", "raca": null, "turmaCode": "MATERNAL-I-A-LUCIENE"},
  {"firstName": "AKILI", "lastName": "REIS SILVA", "cpf": null, "codigoAluno": "1250648", "inscricao": "242420", "dateOfBirth": "2024-03-29T12:00:00.000Z", "gender": "MASCULINO", "raca": "preta", "turmaCode": "MATERNAL-I-B-ANA"},
  {"firstName": "ANTHONY", "lastName": "LEONES LEMOS SILVA CRUZ", "cpf": null, "codigoAluno": "1245294", "inscricao": "238841", "dateOfBirth": "2023-08-20T12:00:00.000Z", "gender": "MASCULINO", "raca": null, "turmaCode": "MATERNAL-I-B-ANA"},
  {"firstName": "ANTHONY", "lastName": "RAPHAEL SOUZA SILVA", "cpf": null, "codigoAluno": "1211261", "inscricao": "226468", "dateOfBirth": "2023-07-08T12:00:00.000Z", "gender": "MASCULINO", "raca": null, "turmaCode": "MATERNAL-I-B-ANA"},
  {"firstName": "ARIEL", "lastName": "BRENDON DE LACERDA SILVA", "cpf": null, "codigoAluno": "1298812", "inscricao": "264278", "dateOfBirth": "2023-07-03T12:00:00.000Z", "gender": "MASCULINO", "raca": null, "turmaCode": "MATERNAL-I-B-ANA"},
  {"firstName": "ARTHUR", "lastName": "MIGUEL FELIX DA SILVA", "cpf": null, "codigoAluno": "1238138", "inscricao": "235274", "dateOfBirth": "2023-10-26T12:00:00.000Z", "gender": "MASCULINO", "raca": "preta", "turmaCode": "MATERNAL-I-A-LUCIENE"},
  {"firstName": "ARTHUR", "lastName": "DOMINIC DE SOUZA EVANGELHO", "cpf": null, "codigoAluno": "1257615", "inscricao": "288488", "dateOfBirth": "2024-02-04T12:00:00.000Z", "gender": "MASCULINO", "raca": "parda", "turmaCode": "MATERNAL-I-C-EDILVANA"},
  {"firstName": "ARTHUR", "lastName": "GABRIEL CAMARA DE OLIVEIRA", "cpf": null, "codigoAluno": "1198228", "inscricao": "221588", "dateOfBirth": "2023-05-09T12:00:00.000Z", "gender": "MASCULINO", "raca": "branca", "turmaCode": "MATERNAL-I-B-ANA"},
  {"firstName": "AURORA", "lastName": "MUNIZ DA CONCEIÇÃO", "cpf": null, "codigoAluno": "1242323", "inscricao": "237555", "dateOfBirth": "2023-09-23T12:00:00.000Z", "gender": "FEMININO", "raca": "branca", "turmaCode": "MATERNAL-I-C-EDILVANA"},
  {"firstName": "EDUARDO", "lastName": "LIMA SILVA", "cpf": null, "codigoAluno": "1250615", "inscricao": "242406", "dateOfBirth": "2023-07-31T12:00:00.000Z", "gender": "MASCULINO", "raca": "preta", "turmaCode": "MATERNAL-I-A-LUCIENE"},
  {"firstName": "ELLENA", "lastName": "SANTOS DE MELO LIMA", "cpf": null, "codigoAluno": "1255183", "inscricao": "246271", "dateOfBirth": "2023-09-27T12:00:00.000Z", "gender": "FEMININO", "raca": "parda", "turmaCode": "MATERNAL-I-A-LUCIENE"},
  {"firstName": "ARTHUR", "lastName": "RAVI DE JESUS", "cpf": null, "codigoAluno": "1268208", "inscricao": "251099", "dateOfBirth": "2023-12-22T12:00:00.000Z", "gender": "MASCULINO", "raca": "parda", "turmaCode": "MATERNAL-I-B-ANA"},
  {"firstName": "CAUA", "lastName": "LUIZ DE JESUS SANTOS", "cpf": null, "codigoAluno": "1205624", "inscricao": "223897", "dateOfBirth": "2023-05-07T12:00:00.000Z", "gender": "MASCULINO", "raca": "parda", "turmaCode": "MATERNAL-I-C-EDILVANA"},
  {"firstName": "GABRIEL", "lastName": "MARQUES DA SILVA", "cpf": null, "codigoAluno": "1239531", "inscricao": "236078", "dateOfBirth": "2023-08-07T12:00:00.000Z", "gender": "MASCULINO", "raca": "parda", "turmaCode": "MATERNAL-I-A-LUCIENE"},
  {"firstName": "GABRIEL", "lastName": "SANTOS VASCONCELOS", "cpf": null, "codigoAluno": "1201906", "inscricao": "223141", "dateOfBirth": "2023-04-08T12:00:00.000Z", "gender": "MASCULINO", "raca": "branca", "turmaCode": "MATERNAL-I-C-EDILVANA"},
  {"firstName": "GAEL", "lastName": "VINICIUS DA SILVA VAZ", "cpf": null, "codigoAluno": "1256505", "inscricao": "247441", "dateOfBirth": "2024-02-03T12:00:00.000Z", "gender": "MASCULINO", "raca": null, "turmaCode": "MATERNAL-I-A-LUCIENE"},
  {"firstName": "HEITOR", "lastName": "FEITOSA DE OLIVEIRA", "cpf": null, "codigoAluno": "1267661", "inscricao": "250729", "dateOfBirth": "2023-10-29T12:00:00.000Z", "gender": "MASCULINO", "raca": "branca", "turmaCode": "MATERNAL-I-C-EDILVANA"},
  {"firstName": "AURORA", "lastName": "LUIZA PEDROSA MENDES", "cpf": null, "codigoAluno": "1288206", "inscricao": "258093", "dateOfBirth": "2023-04-23T12:00:00.000Z", "gender": "FEMININO", "raca": "PARDA", "turmaCode": "MATERNAL-I-B-ANA"},
  {"firstName": "HEITOR", "lastName": "PYETRO SOUSA MOURA", "cpf": null, "codigoAluno": "1274534", "inscricao": "252752", "dateOfBirth": "2023-05-05T12:00:00.000Z", "gender": "MASCULINO", "raca": "parda", "turmaCode": "MATERNAL-I-C-EDILVANA"},
  {"firstName": "HENRY", "lastName": "LUCCA GOMES DE SOUZA", "cpf": null, "codigoAluno": "1207485", "inscricao": "224145", "dateOfBirth": "2023-10-18T12:00:00.000Z", "gender": "MASCULINO", "raca": "parda", "turmaCode": "MATERNAL-I-A-LUCIENE"},
  {"firstName": "ELISA", "lastName": "LOPES SOARES", "cpf": null, "codigoAluno": "1250137", "inscricao": "242068", "dateOfBirth": "2023-11-29T12:00:00.000Z", "gender": "FEMININO", "raca": "parda", "turmaCode": "MATERNAL-I-B-ANA"},
  {"firstName": "ENRICO", "lastName": "PACHECO DE MIRANDA", "cpf": null, "codigoAluno": "1203196", "inscricao": "223455", "dateOfBirth": "2023-05-18T12:00:00.000Z", "gender": "MASCULINO", "raca": "branca", "turmaCode": "MATERNAL-I-B-ANA"},
  {"firstName": "ISADORA", "lastName": "ALVES DOS SANTOS", "cpf": null, "codigoAluno": "1249977", "inscricao": "241941", "dateOfBirth": "2023-12-28T12:00:00.000Z", "gender": "FEMININO", "raca": "parda", "turmaCode": "MATERNAL-I-C-EDILVANA"},
  {"firstName": "ISIS", "lastName": "OLIVEIRA MARTINS DE SOUZA", "cpf": null, "codigoAluno": "1197780", "inscricao": "221306", "dateOfBirth": "2023-07-19T12:00:00.000Z", "gender": "FEMININO", "raca": "branca", "turmaCode": "MATERNAL-I-A-LUCIENE"},
  {"firstName": "JOSE", "lastName": "VITOR DE SOUZA SEIXAS", "cpf": null, "codigoAluno": "1257827", "inscricao": "248700", "dateOfBirth": "2023-12-28T12:00:00.000Z", "gender": "MASCULINO", "raca": "parda", "turmaCode": "MATERNAL-I-C-EDILVANA"},
  {"firstName": "JOAO", "lastName": "MIGUEL SANTOS MENDES", "cpf": null, "codigoAluno": "1304081", "inscricao": "267739", "dateOfBirth": "2024-03-29T12:00:00.000Z", "gender": "MASCULINO", "raca": null, "turmaCode": "MATERNAL-I-A-LUCIENE"},
  {"firstName": "JOSÉ", "lastName": "HENRIQUE CARNEIRO DOS SANTOS", "cpf": null, "codigoAluno": "1216229", "inscricao": "227086", "dateOfBirth": "2023-09-06T12:00:00.000Z", "gender": "MASCULINO", "raca": "parda", "turmaCode": "MATERNAL-I-A-LUCIENE"},
  {"firstName": "HENRY", "lastName": "LUCCA NOGUEIRA DA SILVA", "cpf": null, "codigoAluno": "1208777", "inscricao": "224699", "dateOfBirth": "2023-06-24T12:00:00.000Z", "gender": "MASCULINO", "raca": "parda", "turmaCode": "MATERNAL-I-B-ANA"},
  {"firstName": "ISÍS", "lastName": "VITÓRIA DE SOUZA CAIXETA", "cpf": null, "codigoAluno": "1244997", "inscricao": "238663", "dateOfBirth": "2023-10-22T12:00:00.000Z", "gender": "FEMININO", "raca": "parda", "turmaCode": "MATERNAL-I-B-ANA"},
  {"firstName": "JHULLY", "lastName": "MIKAELLE VERONICA DE OLIVEIRA", "cpf": null, "codigoAluno": "1203735", "inscricao": "223541", "dateOfBirth": "2023-05-15T12:00:00.000Z", "gender": "FEMININO", "raca": "branca", "turmaCode": "MATERNAL-I-B-ANA"},
  {"firstName": "JOSEPH", "lastName": "LUIZ PAIVA ARAÚJO", "cpf": null, "codigoAluno": "1245104", "inscricao": "238737", "dateOfBirth": "2023-06-23T12:00:00.000Z", "gender": "MASCULINO", "raca": "branca", "turmaCode": "MATERNAL-I-C-EDILVANA"},
  {"firstName": "LUNA", "lastName": "VIEIRA DE SOUSA", "cpf": null, "codigoAluno": "1315303", "inscricao": "274829", "dateOfBirth": "2024-01-15T12:00:00.000Z", "gender": "FEMININO", "raca": null, "turmaCode": "MATERNAL-I-A-LUCIENE"},
  {"firstName": "JOSUE", "lastName": "KALLEBY PINHEIRO DA SILVA", "cpf": null, "codigoAluno": "1234330", "inscricao": "233262", "dateOfBirth": "2023-05-23T12:00:00.000Z", "gender": "MASCULINO", "raca": "parda", "turmaCode": "MATERNAL-I-A-LUCIENE"},
  {"firstName": "KAYQUE", "lastName": "SANTANA", "cpf": null, "codigoAluno": "1303098", "inscricao": "266998", "dateOfBirth": "2024-02-10T12:00:00.000Z", "gender": "MASCULINO", "raca": null, "turmaCode": "MATERNAL-I-A-LUCIENE"},
  {"firstName": "LORENZO", "lastName": "BEZERRA DOS SANTOS", "cpf": null, "codigoAluno": "1232826", "inscricao": "232570", "dateOfBirth": "2023-02-04T12:00:00.000Z", "gender": "MASCULINO", "raca": "parda", "turmaCode": "MATERNAL-I-C-EDILVANA"},
  {"firstName": "LARA", "lastName": "VICENTE DOS SANTOS", "cpf": null, "codigoAluno": "1216054", "inscricao": "227067", "dateOfBirth": "2023-05-23T12:00:00.000Z", "gender": "FEMININO", "raca": "preta", "turmaCode": "MATERNAL-I-A-LUCIENE"},
  {"firstName": "NOAH", "lastName": "ARAUJO ALVES SILVEIRA", "cpf": null, "codigoAluno": "1253368", "inscricao": "244724", "dateOfBirth": "2024-01-08T12:00:00.000Z", "gender": "MASCULINO", "raca": "Branca", "turmaCode": "MATERNAL-I-C-EDILVANA"},
  {"firstName": "JOANA", "lastName": "DOS SANTOS GOMES", "cpf": null, "codigoAluno": "1236587", "inscricao": "234412", "dateOfBirth": "2023-08-10T12:00:00.000Z", "gender": "FEMININO", "raca": "parda", "turmaCode": "MATERNAL-I-B-ANA"},
  {"firstName": "OTAVIO", "lastName": "GASPAR DE CARVALHO", "cpf": null, "codigoAluno": "1211322", "inscricao": "226511", "dateOfBirth": "2023-07-11T12:00:00.000Z", "gender": "MASCULINO", "raca": "parda", "turmaCode": "MATERNAL-I-C-EDILVANA"},
  {"firstName": "LUISA", "lastName": "GIOVANNA LEONIS SIQUEIRA DA SILVA", "cpf": null, "codigoAluno": "1297273", "inscricao": "263603", "dateOfBirth": "2024-03-15T12:00:00.000Z", "gender": "FEMININO", "raca": null, "turmaCode": "MATERNAL-I-A-LUCIENE"},
  {"firstName": "ANA", "lastName": "JÚLIA RODRIGUES NUNES", "cpf": null, "codigoAluno": "1164369", "inscricao": "202806", "dateOfBirth": "2022-10-07T12:00:00.000Z", "gender": "FEMININO", "raca": "parda", "turmaCode": "MATERNAL-II-A-RAQUEL"},
  {"firstName": "ANTONELLA", "lastName": "FATIMA PEREIRA SAMPAIO", "cpf": null, "codigoAluno": "1245813", "inscricao": "239159", "dateOfBirth": "2023-02-21T12:00:00.000Z", "gender": "FEMININO", "raca": "parda", "turmaCode": "MATERNAL-II-A-RAQUEL"},
  {"firstName": "ARTUR", "lastName": "DE ARAUJO COSTA", "cpf": null, "codigoAluno": "1192378", "inscricao": "217084", "dateOfBirth": "2022-09-14T12:00:00.000Z", "gender": "MASCULINO", "raca": "branca", "turmaCode": "MATERNAL-II-A-RAQUEL"},
  {"firstName": "AYLA", "lastName": "VITORIA SILVA", "cpf": null, "codigoAluno": "227427", "inscricao": "227427", "dateOfBirth": "2023-01-16T12:00:00.000Z", "gender": "FEMININO", "raca": "parda", "turmaCode": "MATERNAL-II-A-RAQUEL"},
  {"firstName": "AYUNNE", "lastName": "RAFAELLE FERREIRA BERNARDES DOS SANTOS", "cpf": null, "codigoAluno": "1242998", "inscricao": "237815", "dateOfBirth": "2023-02-09T12:00:00.000Z", "gender": "FEMININO", "raca": "preta", "turmaCode": "MATERNAL-II-A-RAQUEL"},
  {"firstName": "ALANA", "lastName": "EVELYN FERREIRA DE JESUS", "cpf": null, "codigoAluno": "1194990", "inscricao": "219136", "dateOfBirth": "2022-07-13T12:00:00.000Z", "gender": "FEMININO", "raca": "branca", "turmaCode": "MATERNAL-II-C-EVELLYN"},
  {"firstName": "ALICIA", "lastName": "DE SOUSA RIBEIRO", "cpf": null, "codigoAluno": "1194821", "inscricao": "218987", "dateOfBirth": "2022-07-12T12:00:00.000Z", "gender": "FEMININO", "raca": "parda", "turmaCode": "MATERNAL-II-B-ANGELICA"},
  {"firstName": "ANTONY", "lastName": "POMPEU RANGEL", "cpf": null, "codigoAluno": "1190310", "inscricao": "215336", "dateOfBirth": "2022-10-18T12:00:00.000Z", "gender": "MASCULINO", "raca": "sd", "turmaCode": "MATERNAL-II-B-ANGELICA"},
  {"firstName": "ARTHUR", "lastName": "RAVI FERREIRA CARDOSO", "cpf": null, "codigoAluno": "1149352", "inscricao": "199204", "dateOfBirth": "2022-04-14T12:00:00.000Z", "gender": "MASCULINO", "raca": "parda", "turmaCode": "MATERNAL-II-B-ANGELICA"},
  {"firstName": "BERNARDO", "lastName": "HENRIQUE SOUZA RIBEIRO", "cpf": null, "codigoAluno": "1240079", "inscricao": "236492", "dateOfBirth": "2022-12-01T12:00:00.000Z", "gender": "MASCULINO", "raca": "parda", "turmaCode": "MATERNAL-II-A-RAQUEL"},
  {"firstName": "BRAYAN", "lastName": "BRENO SANTOS MELO", "cpf": null, "codigoAluno": "1164390", "inscricao": "202813", "dateOfBirth": "2022-06-09T12:00:00.000Z", "gender": "MASCULINO", "raca": "parda", "turmaCode": "MATERNAL-II-A-RAQUEL"},
  {"firstName": "DERICK", "lastName": "DOS SANTOS SANTANA", "cpf": null, "codigoAluno": "1200472", "inscricao": "222637", "dateOfBirth": "2023-01-16T12:00:00.000Z", "gender": "MASCULINO", "raca": "branca", "turmaCode": "MATERNAL-II-A-RAQUEL"},
  {"firstName": "BRENNY", "lastName": "MIZAEL MOREIRA DA COSTA", "cpf": null, "codigoAluno": "1218052", "inscricao": "227419", "dateOfBirth": "2023-01-11T12:00:00.000Z", "gender": "MASCULINO", "raca": "branca", "turmaCode": "MATERNAL-II-B-ANGELICA"},
  {"firstName": "ELOA", "lastName": "THALITA BARBOSA FARIAS", "cpf": null, "codigoAluno": "1167738", "inscricao": "204140", "dateOfBirth": "2022-11-11T12:00:00.000Z", "gender": "FEMININO", "raca": "parda", "turmaCode": "MATERNAL-II-A-RAQUEL"},
  {"firstName": "BRYAN", "lastName": "LUCCA ARAUJO DOS SANTOS", "cpf": null, "codigoAluno": "1189823", "inscricao": "214932", "dateOfBirth": "2022-08-29T12:00:00.000Z", "gender": "MASCULINO", "raca": "parda", "turmaCode": "MATERNAL-II-B-ANGELICA"},
  {"firstName": "ESTHER", "lastName": "DA SILVA SANTOS", "cpf": null, "codigoAluno": "1182419", "inscricao": "211745", "dateOfBirth": "2022-04-07T12:00:00.000Z", "gender": "FEMININO", "raca": "branca", "turmaCode": "MATERNAL-II-A-RAQUEL"},
  {"firstName": "ANNA", "lastName": "HELENA RODRIGUES SOUSA", "cpf": null, "codigoAluno": "1243491", "inscricao": "237961", "dateOfBirth": "2023-01-15T12:00:00.000Z", "gender": "FEMININO", "raca": "PARda L M S D J", "turmaCode": "MATERNAL-II-C-EVELLYN"},
  {"firstName": "GABRIEL", "lastName": "GUIMARÃES DE ANDRADE", "cpf": null, "codigoAluno": "1197840", "inscricao": "221356", "dateOfBirth": "2023-02-20T12:00:00.000Z", "gender": "FEMININO", "raca": "branca", "turmaCode": "MATERNAL-II-A-RAQUEL"},
  {"firstName": "CAIO", "lastName": "GOMES CARVALHO", "cpf": null, "codigoAluno": "1176991", "inscricao": "208511", "dateOfBirth": "2022-06-18T12:00:00.000Z", "gender": "MASCULINO", "raca": "parda", "turmaCode": "MATERNAL-II-B-ANGELICA"},
  {"firstName": "GUSTAVO", "lastName": "MAKS SANTOS SOUZA", "cpf": null, "codigoAluno": "1147309", "inscricao": "197595", "dateOfBirth": "2022-07-28T12:00:00.000Z", "gender": "MASCULINO", "raca": "branca", "turmaCode": "MATERNAL-II-A-RAQUEL"},
  {"firstName": "ELOA", "lastName": "DA SILVA SANTOS", "cpf": null, "codigoAluno": "1182420", "inscricao": "211746", "dateOfBirth": "2022-04-07T12:00:00.000Z", "gender": "FEMININO", "raca": "branca", "turmaCode": "MATERNAL-II-B-ANGELICA"},
  {"firstName": "ANNA", "lastName": "MELL LOPES BARBOSA", "cpf": null, "codigoAluno": "1220432", "inscricao": "228024", "dateOfBirth": "2022-07-04T12:00:00.000Z", "gender": "FEMININO", "raca": "parda", "turmaCode": "MATERNAL-II-C-EVELLYN"},
  {"firstName": "HELENA", "lastName": "BARBOSA SIRQUEIRA", "cpf": "11333394179.0", "codigoAluno": "1200917", "inscricao": "222781", "dateOfBirth": "2023-01-04T12:00:00.000Z", "gender": "FEMININO", "raca": "parda", "turmaCode": "MATERNAL-II-A-RAQUEL"},
  {"firstName": "EMANUELLY", "lastName": "LORRANE ALMEIDA CHINELLI", "cpf": null, "codigoAluno": "1166202", "inscricao": "203560", "dateOfBirth": "2022-10-31T12:00:00.000Z", "gender": "FEMININO", "raca": "branca", "turmaCode": "MATERNAL-II-B-ANGELICA"},
  {"firstName": "ANTHONY", "lastName": "GAEL SILVA GOMES", "cpf": null, "codigoAluno": "1268582", "inscricao": "251321", "dateOfBirth": "2022-11-11T12:00:00.000Z", "gender": "MASCULINO", "raca": "parda", "turmaCode": "MATERNAL-II-C-EVELLYN"},
  {"firstName": "GUSTAVO", "lastName": "DOS SANTOS SOUZA", "cpf": null, "codigoAluno": "1148909", "inscricao": "198786", "dateOfBirth": "2022-08-25T12:00:00.000Z", "gender": "MASCULINO", "raca": null, "turmaCode": "MATERNAL-II-B-ANGELICA"},
  {"firstName": "HADASSA", "lastName": "ESTER LIMA DOS SANTOS", "cpf": null, "codigoAluno": "1240498", "inscricao": "236792", "dateOfBirth": "2023-01-01T12:00:00.000Z", "gender": "FEMININO", "raca": "parda", "turmaCode": "MATERNAL-II-B-ANGELICA"},
  {"firstName": "HEITOR", "lastName": "ELIACAN FERREIRA LIMA", "cpf": null, "codigoAluno": "1239154", "inscricao": "235819", "dateOfBirth": "2022-07-15T12:00:00.000Z", "gender": "MASCULINO", "raca": null, "turmaCode": "MATERNAL-II-B-ANGELICA"},
  {"firstName": "AURORA", "lastName": "DIB PEREIRA BERNARDINO RODRIGUES", "cpf": null, "codigoAluno": "1208049", "inscricao": "224329", "dateOfBirth": "2022-07-20T12:00:00.000Z", "gender": "FEMININO", "raca": "branca", "turmaCode": "MATERNAL-II-C-EVELLYN"},
  {"firstName": "AYLLA", "lastName": "ALMEIDA CAVALCANTI", "cpf": null, "codigoAluno": "1160126", "inscricao": "201682", "dateOfBirth": "2022-10-08T12:00:00.000Z", "gender": "FEMININO", "raca": "parda", "turmaCode": "MATERNAL-II-C-EVELLYN"},
  {"firstName": "CECILIA", "lastName": "CABRAL DE FREITAS", "cpf": null, "codigoAluno": "1184100", "inscricao": "212254", "dateOfBirth": "2022-06-16T12:00:00.000Z", "gender": "FEMININO", "raca": "branca", "turmaCode": "MATERNAL-II-C-EVELLYN"},
  {"firstName": "ISABELLY", "lastName": "CRISTINA ALMEIDA CHINELLI", "cpf": null, "codigoAluno": "1166204", "inscricao": "203561", "dateOfBirth": "2022-10-31T12:00:00.000Z", "gender": "FEMININO", "raca": "parda", "turmaCode": "MATERNAL-II-A-RAQUEL"},
  {"firstName": "CECILLYA", "lastName": "MENDONÇA DA SILVA", "cpf": null, "codigoAluno": "1149688", "inscricao": "199524", "dateOfBirth": "2022-06-23T12:00:00.000Z", "gender": "FEMININO", "raca": "parda", "turmaCode": "MATERNAL-II-C-EVELLYN"},
  {"firstName": "ESTHER", "lastName": "HADASSA SANTIAGO SOUZA", "cpf": null, "codigoAluno": "1135167", "inscricao": "194727", "dateOfBirth": "2022-04-26T12:00:00.000Z", "gender": "FEMININO", "raca": "parda", "turmaCode": "MATERNAL-II-C-EVELLYN"},
  {"firstName": "HILBERT", "lastName": "SOUSA FROES", "cpf": null, "codigoAluno": "1180834", "inscricao": "210808", "dateOfBirth": "2022-09-05T12:00:00.000Z", "gender": "MASCULINO", "raca": "preta", "turmaCode": "MATERNAL-II-B-ANGELICA"},
  {"firstName": "ISAAC", "lastName": "GABRIEL GOMES DA SILVA ARAUJO", "cpf": null, "codigoAluno": "1248877", "inscricao": "241037", "dateOfBirth": "2023-01-03T12:00:00.000Z", "gender": "MASCULINO", "raca": "branca", "turmaCode": "MATERNAL-II-B-ANGELICA"},
  {"firstName": "JOÃO", "lastName": "MIGUEL PEREIRA LIMA", "cpf": null, "codigoAluno": "1237841", "inscricao": "235135", "dateOfBirth": "2022-11-11T12:00:00.000Z", "gender": "MASCULINO", "raca": "preta", "turmaCode": "MATERNAL-II-B-ANGELICA"},
  {"firstName": "JOÃO", "lastName": "VITOR DA FONSECA FERREIRA", "cpf": null, "codigoAluno": "1193647", "inscricao": "218052", "dateOfBirth": "2022-04-30T12:00:00.000Z", "gender": "MASCULINO", "raca": "parda", "turmaCode": "MATERNAL-II-B-ANGELICA"},
  {"firstName": "JOSÉ", "lastName": "LORENZO MARÇAL SAMPAIO", "cpf": null, "codigoAluno": "1182515", "inscricao": "211784", "dateOfBirth": "2022-08-27T12:00:00.000Z", "gender": "MASCULINO", "raca": "parda", "turmaCode": "MATERNAL-II-A-RAQUEL"},
  {"firstName": "LARA", "lastName": "LIMA DE OLIVEIRA", "cpf": null, "codigoAluno": "1211893", "inscricao": "226619", "dateOfBirth": "2022-11-16T12:00:00.000Z", "gender": "FEMININO", "raca": "parda", "turmaCode": "MATERNAL-II-A-RAQUEL"},
  {"firstName": "GABRIEL", "lastName": "MATHEUS RIBEIRO DE MESQUITA", "cpf": null, "codigoAluno": "1175930", "inscricao": "207891", "dateOfBirth": "2022-10-03T12:00:00.000Z", "gender": "MASCULINO", "raca": "parda", "turmaCode": "MATERNAL-II-C-EVELLYN"},
  {"firstName": "JÚLIA", "lastName": "VASCONCELOS SILVA", "cpf": null, "codigoAluno": "1208958", "inscricao": "224840", "dateOfBirth": "2022-12-06T12:00:00.000Z", "gender": "FEMININO", "raca": "parda", "turmaCode": "MATERNAL-II-B-ANGELICA"},
  {"firstName": "KHALEESI", "lastName": "RAVENA SILVA DAS CHAGAS", "cpf": null, "codigoAluno": "1192670", "inscricao": "217280", "dateOfBirth": "2022-08-25T12:00:00.000Z", "gender": "FEMININO", "raca": "preta", "turmaCode": "MATERNAL-II-B-ANGELICA"},
  {"firstName": "MADALENA", "lastName": "SOUZA ANDRADE", "cpf": null, "codigoAluno": "1188091", "inscricao": "213811", "dateOfBirth": "2022-11-16T12:00:00.000Z", "gender": "FEMININO", "raca": "parda", "turmaCode": "MATERNAL-II-B-ANGELICA"},
  {"firstName": "LOUISE", "lastName": "VITORIA GONÇALVES SOUZA", "cpf": null, "codigoAluno": "1209636", "inscricao": "225362", "dateOfBirth": "2023-03-04T12:00:00.000Z", "gender": "FEMININO", "raca": "Branca", "turmaCode": "MATERNAL-II-A-RAQUEL"},
  {"firstName": "MARCOS", "lastName": "VENTURA RAMOS", "cpf": null, "codigoAluno": "1138110", "inscricao": "195740", "dateOfBirth": "2022-06-03T12:00:00.000Z", "gender": "MASCULINO", "raca": "parda", "turmaCode": "MATERNAL-II-A-RAQUEL"},
  {"firstName": "HEITOR", "lastName": "GABRIEL DA COSTA SILVA", "cpf": null, "codigoAluno": "1210751", "inscricao": "226153", "dateOfBirth": "2023-07-27T12:00:00.000Z", "gender": "MASCULINO", "raca": "parda", "turmaCode": "MATERNAL-II-C-EVELLYN"},
  {"firstName": "MARIA", "lastName": "ALICE ALVES BRAGA", "cpf": null, "codigoAluno": "1136722", "inscricao": "195344", "dateOfBirth": "2022-07-18T12:00:00.000Z", "gender": "FEMININO", "raca": "parda", "turmaCode": "MATERNAL-II-A-RAQUEL"},
  {"firstName": "PEDRO", "lastName": "HENRIQUE DE BRITO LIMA", "cpf": null, "codigoAluno": "1251810", "inscricao": "243373", "dateOfBirth": "2023-01-07T12:00:00.000Z", "gender": "MASCULINO", "raca": "branca", "turmaCode": "MATERNAL-II-B-ANGELICA"},
  {"firstName": "MIGUEL", "lastName": "ANTONIO SOUSA FARIAS", "cpf": null, "codigoAluno": "1181709", "inscricao": "211348", "dateOfBirth": "2022-09-02T12:00:00.000Z", "gender": "MASCULINO", "raca": "parda", "turmaCode": "MATERNAL-II-A-RAQUEL"},
  {"firstName": "PEDRO", "lastName": "LUCCA BORGES SILVA", "cpf": null, "codigoAluno": "1189743", "inscricao": "214863", "dateOfBirth": "2022-08-24T12:00:00.000Z", "gender": "MASCULINO", "raca": "branca", "turmaCode": "MATERNAL-II-A-RAQUEL"},
  {"firstName": "RHAVI", "lastName": "ALVES DE MELO", "cpf": null, "codigoAluno": "1186920", "inscricao": "213296", "dateOfBirth": "2022-08-28T12:00:00.000Z", "gender": "MASCULINO", "raca": "branca", "turmaCode": "MATERNAL-II-B-ANGELICA"},
  {"firstName": "RICHARD", "lastName": "HEITOR ARAUJO SANTOS", "cpf": null, "codigoAluno": "1157214", "inscricao": "201323", "dateOfBirth": "2022-07-13T12:00:00.000Z", "gender": "MASCULINO", "raca": "sd", "turmaCode": "MATERNAL-II-B-ANGELICA"},
  {"firstName": "HENRIQUE", "lastName": "LUIS DA SILVA FIGUEREDO", "cpf": null, "codigoAluno": "1148180", "inscricao": "198177", "dateOfBirth": "2022-05-14T12:00:00.000Z", "gender": "MASCULINO", "raca": "parda", "turmaCode": "MATERNAL-II-C-EVELLYN"},
  {"firstName": "RAPHAEL", "lastName": "RAMOS FERREIRA DA SILVA", "cpf": null, "codigoAluno": "1209453", "inscricao": "225204", "dateOfBirth": "2023-02-22T12:00:00.000Z", "gender": "MASCULINO", "raca": "parda", "turmaCode": "MATERNAL-II-A-RAQUEL"},
  {"firstName": "RAVI", "lastName": "MAGNO ALENCAR DOS SANTOS", "cpf": null, "codigoAluno": "1209044", "inscricao": "224880", "dateOfBirth": "2023-01-14T12:00:00.000Z", "gender": "MASCULINO", "raca": "branca", "turmaCode": "MATERNAL-II-A-RAQUEL"},
  {"firstName": "YASMIN", "lastName": "ALMEIDA ANDRADE", "cpf": null, "codigoAluno": "1191456", "inscricao": "216307", "dateOfBirth": "2023-03-24T12:00:00.000Z", "gender": "FEMININO", "raca": "branca", "turmaCode": "MATERNAL-II-A-RAQUEL"},
  {"firstName": "THÉO", "lastName": "DE SOUSA LIMA", "cpf": null, "codigoAluno": "1163337", "inscricao": "202426", "dateOfBirth": "2022-07-07T12:00:00.000Z", "gender": "MASCULINO", "raca": "parda", "turmaCode": "MATERNAL-II-B-ANGELICA"},
  {"firstName": "MANUELLA", "lastName": "VITORIA DE SOUZA HIAPINO", "cpf": null, "codigoAluno": "1199192", "inscricao": "222060", "dateOfBirth": "2023-05-06T12:00:00.000Z", "gender": "FEMININO", "raca": "parda", "turmaCode": "MATERNAL-I-A-LUCIENE"},
  {"firstName": "JOSUE", "lastName": "OTNYEL FERREIRA DE SOUSA", "cpf": null, "codigoAluno": "1252262", "inscricao": "243741", "dateOfBirth": "2023-05-19T12:00:00.000Z", "gender": "MASCULINO", "raca": null, "turmaCode": "MATERNAL-I-B-ANA"},
  {"firstName": "JOAQUIM", "lastName": "VIANA DOS SANTOS", "cpf": null, "codigoAluno": "1278056", "inscricao": "253672", "dateOfBirth": "2024-09-11T12:00:00.000Z", "gender": "MASCULINO", "raca": null, "turmaCode": "BERCARIO-II-B-JESSICA"},
  {"firstName": "LEVY", "lastName": "HENRIQUE RODRIGUES", "cpf": null, "codigoAluno": "1267237", "inscricao": "250452", "dateOfBirth": "2024-10-06T12:00:00.000Z", "gender": "FEMININO", "raca": null, "turmaCode": "BERCARIO-II-B-JESSICA"},
  {"firstName": "JUAN", "lastName": "HORTENCIO DE OLIVEIRA ROCHA", "cpf": null, "codigoAluno": "1303192", "inscricao": "267066", "dateOfBirth": "2024-08-21T12:00:00.000Z", "gender": "MASCULINO", "raca": null, "turmaCode": "BERCARIO-II-A-ELISANGELA"},
  {"firstName": "KATALEYA", "lastName": "ELISABETH PALMERO CORRALES", "cpf": null, "codigoAluno": "1291920", "inscricao": "260094", "dateOfBirth": "2024-07-07T12:00:00.000Z", "gender": "FEMININO", "raca": "preta", "turmaCode": "BERCARIO-II-A-ELISANGELA"},
  {"firstName": "JADE", "lastName": "TORRES DO AMARAL", "cpf": null, "codigoAluno": "1172664", "inscricao": "206233", "dateOfBirth": "2022-08-08T12:00:00.000Z", "gender": "FEMININO", "raca": "branca", "turmaCode": "MATERNAL-II-C-EVELLYN"},
  {"firstName": "MAITE", "lastName": "SOARES SILVA", "cpf": null, "codigoAluno": "1197331", "inscricao": "221009", "dateOfBirth": "2023-07-13T12:00:00.000Z", "gender": "FEMININO", "raca": "parda", "turmaCode": "MATERNAL-I-B-ANA"},
  {"firstName": "MARIA", "lastName": "SOFIA DOS SANTOS MAGALHÃES", "cpf": null, "codigoAluno": "1207961", "inscricao": "224297", "dateOfBirth": "2023-04-16T12:00:00.000Z", "gender": "FEMININO", "raca": "parda", "turmaCode": "MATERNAL-I-B-ANA"},
  {"firstName": "MURILO", "lastName": "DIAS MIRANDA", "cpf": null, "codigoAluno": "1232301", "inscricao": "232337", "dateOfBirth": "2023-07-19T12:00:00.000Z", "gender": "MASCULINO", "raca": "parda", "turmaCode": "MATERNAL-I-B-ANA"},
  {"firstName": "RAVI", "lastName": "MIGUEL LOPES NUNES", "cpf": null, "codigoAluno": "1200863", "inscricao": "222766", "dateOfBirth": "2023-02-04T12:00:00.000Z", "gender": "MASCULINO", "raca": "parda", "turmaCode": "MATERNAL-I-B-ANA"},
  {"firstName": "SAMUEL", "lastName": "ELIAS LIMA MARQUES", "cpf": null, "codigoAluno": "1299551", "inscricao": "264679", "dateOfBirth": "2023-06-26T12:00:00.000Z", "gender": "MASCULINO", "raca": null, "turmaCode": "MATERNAL-I-B-ANA"},
  {"firstName": "SARAH", "lastName": "MARIA DE JESUS MENDES", "cpf": null, "codigoAluno": "1252108", "inscricao": "243607", "dateOfBirth": "2024-02-19T12:00:00.000Z", "gender": "FEMININO", "raca": null, "turmaCode": "MATERNAL-I-B-ANA"},
  {"firstName": "VALENTINA", "lastName": "SOARES GUIMARAES", "cpf": null, "codigoAluno": "1227912", "inscricao": "230282", "dateOfBirth": "2023-07-21T12:00:00.000Z", "gender": "FEMININO", "raca": null, "turmaCode": "MATERNAL-I-B-ANA"},
  {"firstName": "PIETRO", "lastName": "RIBEIRO LOPES", "cpf": null, "codigoAluno": "1217965", "inscricao": "227395", "dateOfBirth": "2023-04-17T12:00:00.000Z", "gender": "MASCULINO", "raca": "parda", "turmaCode": "MATERNAL-I-C-EDILVANA"},
  {"firstName": "MARIA", "lastName": "EDUARDA SOARES", "cpf": null, "codigoAluno": "1301695", "inscricao": "266023", "dateOfBirth": "2024-09-10T12:00:00.000Z", "gender": "FEMININO", "raca": null, "turmaCode": "BERCARIO-II-B-JESSICA"},
  {"firstName": "MARIA", "lastName": "HELENA CORDEIRO DE SENA", "cpf": null, "codigoAluno": "1281949", "inscricao": "255066", "dateOfBirth": "2024-08-26T12:00:00.000Z", "gender": "FEMININO", "raca": "parda", "turmaCode": "BERCARIO-II-B-JESSICA"},
  {"firstName": "MATTEO", "lastName": "LUIZ SILVA GOMES", "cpf": null, "codigoAluno": "1268585", "inscricao": "251323", "dateOfBirth": "2024-08-27T12:00:00.000Z", "gender": "MASCULINO", "raca": "parda", "turmaCode": "BERCARIO-II-B-JESSICA"},
  {"firstName": "RAVIE", "lastName": "MILLER FERREIRA RODRIGUES PEIXOTO LOPES", "cpf": null, "codigoAluno": "1290643", "inscricao": "259430", "dateOfBirth": "2025-03-19T12:00:00.000Z", "gender": "MASCULINO", "raca": null, "turmaCode": "BERCARIO-II-B-JESSICA"},
  {"firstName": "RAYLA", "lastName": "DE LUCENA CRIZANTE", "cpf": null, "codigoAluno": "1257834", "inscricao": "248707", "dateOfBirth": "2024-07-14T12:00:00.000Z", "gender": "FEMININO", "raca": "branca", "turmaCode": "BERCARIO-II-B-JESSICA"},
  {"firstName": "THEO", "lastName": "JOSE MARTINS DE ANGELIM", "cpf": null, "codigoAluno": "1299429", "inscricao": "264605", "dateOfBirth": "2025-02-17T12:00:00.000Z", "gender": "MASCULINO", "raca": null, "turmaCode": "BERCARIO-II-B-JESSICA"},
  {"firstName": "JOÃO", "lastName": "MIGUEL ALMEIDA DE SOUSA SILVA", "cpf": null, "codigoAluno": "198571", "inscricao": "198571", "dateOfBirth": "2022-08-22T12:00:00.000Z", "gender": "MASCULINO", "raca": "parda", "turmaCode": "MATERNAL-II-C-EVELLYN"},
  {"firstName": "AYLLA", "lastName": "LOPES", "cpf": null, "codigoAluno": "1309269", "inscricao": "272126", "dateOfBirth": "2025-06-29T12:00:00.000Z", "gender": "FEMININO", "raca": null, "turmaCode": "BERCARIO-I-NONATA"},
  {"firstName": "EDUARDO", "lastName": "ALVES LIMA", "cpf": null, "codigoAluno": "1309613", "inscricao": "272416", "dateOfBirth": "2025-08-28T12:00:00.000Z", "gender": "MASCULINO", "raca": null, "turmaCode": "BERCARIO-I-NONATA"},
  {"firstName": "IVINA", "lastName": "MARIA CUNHA DE OLIVEIRA", "cpf": null, "codigoAluno": "1308121", "inscricao": "271107", "dateOfBirth": "2025-05-22T12:00:00.000Z", "gender": "FEMININO", "raca": null, "turmaCode": "BERCARIO-I-NONATA"},
  {"firstName": "HENRY", "lastName": "SOARES MONTEIRO", "cpf": null, "codigoAluno": "1306676", "inscricao": "269847", "dateOfBirth": "2025-07-07T12:00:00.000Z", "gender": "MASCULINO", "raca": null, "turmaCode": "BERCARIO-I-NONATA"},
  {"firstName": "MARIA", "lastName": "JULIA RIBEIRO DRUMON DE SOUSA", "cpf": null, "codigoAluno": "1308228", "inscricao": "271188", "dateOfBirth": "2025-08-02T12:00:00.000Z", "gender": "FEMININO", "raca": null, "turmaCode": "BERCARIO-I-NONATA"},
  {"firstName": "MIGUEL", "lastName": "HENRIQUE FERREIRA SOUZA", "cpf": null, "codigoAluno": "1309882", "inscricao": "272676", "dateOfBirth": "2025-05-01T12:00:00.000Z", "gender": "MASCULINO", "raca": null, "turmaCode": "BERCARIO-I-NONATA"},
  {"firstName": "MAITE", "lastName": "SOPHIA PASSOS DA SILVA", "cpf": null, "codigoAluno": "1318358", "inscricao": "275273", "dateOfBirth": "2025-04-01T12:00:00.000Z", "gender": "MASCULINO", "raca": null, "turmaCode": "BERCARIO-I-NONATA"},
  {"firstName": "PEDRO", "lastName": "RODRIGUES OLIVEIRA DE ALBUQUERQUE", "cpf": null, "codigoAluno": "1306718", "inscricao": "269886", "dateOfBirth": "2025-04-03T12:00:00.000Z", "gender": "MASCULINO", "raca": null, "turmaCode": "BERCARIO-I-NONATA"},
  {"firstName": "MARIAH", "lastName": "SILVA MORAIS", "cpf": null, "codigoAluno": "1307327", "inscricao": "270430", "dateOfBirth": "2025-03-07T12:00:00.000Z", "gender": "FEMININO", "raca": null, "turmaCode": "BERCARIO-II-A-ELISANGELA"},
  {"firstName": "MIGUEL", "lastName": "BATISTA DA SILVA", "cpf": null, "codigoAluno": "1301935", "inscricao": "266177", "dateOfBirth": "2024-06-01T12:00:00.000Z", "gender": "MASCULINO", "raca": null, "turmaCode": "BERCARIO-II-A-ELISANGELA"},
  {"firstName": "NOAH", "lastName": "SOUSA PINHEIRO", "cpf": null, "codigoAluno": "1303510", "inscricao": "267268", "dateOfBirth": "2024-07-20T12:00:00.000Z", "gender": "FEMININO", "raca": null, "turmaCode": "BERCARIO-II-A-ELISANGELA"},
  {"firstName": "RAVI", "lastName": "LUCCA GONÇALO DOS SANTOS", "cpf": null, "codigoAluno": "1266326", "inscricao": "249989", "dateOfBirth": "2024-04-19T12:00:00.000Z", "gender": "MASCULINO", "raca": "parda", "turmaCode": "BERCARIO-II-A-ELISANGELA"},
  {"firstName": "SOFIA", "lastName": "BELLA ALVES DOS SANTOS", "cpf": null, "codigoAluno": "1253681", "inscricao": "244997", "dateOfBirth": "2024-07-24T12:00:00.000Z", "gender": "FEMININO", "raca": "parda", "turmaCode": "BERCARIO-II-A-ELISANGELA"},
  {"firstName": "JOHN", "lastName": "KEVEN MARTINS OLIVEIRA DE ASSIS", "cpf": null, "codigoAluno": "1211910", "inscricao": "226626", "dateOfBirth": "2022-12-17T12:00:00.000Z", "gender": "MASCULINO", "raca": "parda", "turmaCode": "MATERNAL-II-C-EVELLYN"},
  {"firstName": "KAYRAN", "lastName": "LORENZO DE FRANÇA", "cpf": null, "codigoAluno": "1177240", "inscricao": "208655", "dateOfBirth": "2022-11-26T12:00:00.000Z", "gender": "MASCULINO", "raca": "preta", "turmaCode": "MATERNAL-II-C-EVELLYN"},
  {"firstName": "LARA", "lastName": "SOPHIA RODRIGUES ALVES", "cpf": null, "codigoAluno": "1291098", "inscricao": "259678", "dateOfBirth": "2022-06-16T12:00:00.000Z", "gender": "FEMININO", "raca": "PARda L M S D J", "turmaCode": "MATERNAL-II-C-EVELLYN"},
  {"firstName": "MARIA", "lastName": "HELENA MENDES NERY", "cpf": null, "codigoAluno": "1145970", "inscricao": "197253", "dateOfBirth": "2022-07-06T12:00:00.000Z", "gender": "FEMININO", "raca": "branca", "turmaCode": "MATERNAL-II-C-EVELLYN"},
  {"firstName": "VICTOR", "lastName": "HARIEL DOS SANTOS MARTINS", "cpf": null, "codigoAluno": "1242550", "inscricao": "237639", "dateOfBirth": "2023-01-23T12:00:00.000Z", "gender": "MASCULINO", "raca": "parda", "turmaCode": "MATERNAL-II-B-ANGELICA"},
  {"firstName": "ZAYA", "lastName": "RIBEIRO DE ALMEIDA", "cpf": null, "codigoAluno": "1218623", "inscricao": "227631", "dateOfBirth": "2023-03-01T12:00:00.000Z", "gender": "FEMININO", "raca": "preta", "turmaCode": "MATERNAL-II-B-ANGELICA"},
  {"firstName": "MATEUS", "lastName": "VENTURA RAMOS", "cpf": null, "codigoAluno": "1138375", "inscricao": "195792", "dateOfBirth": "2022-06-03T12:00:00.000Z", "gender": "MASCULINO", "raca": "parda", "turmaCode": "MATERNAL-II-C-EVELLYN"},
  {"firstName": "VICTOR", "lastName": "HARIEL DOS SANTOS MARTINS", "cpf": null, "codigoAluno": "1147589", "inscricao": "197755", "dateOfBirth": "2022-06-20T12:00:00.000Z", "gender": "FEMININO", "raca": "parda", "turmaCode": "MATERNAL-II-C-EVELLYN"},
  {"firstName": "MIQUEIAS", "lastName": "BARBOSA DE JESUS", "cpf": null, "codigoAluno": "1202529", "inscricao": "223258", "dateOfBirth": "2022-12-06T12:00:00.000Z", "gender": "MASCULINO", "raca": "parda", "turmaCode": "MATERNAL-II-C-EVELLYN"},
  {"firstName": "RAVI", "lastName": "JERONIMO LOPES", "cpf": null, "codigoAluno": "1141023", "inscricao": "196526", "dateOfBirth": "2022-08-14T12:00:00.000Z", "gender": "MASCULINO", "raca": "parda", "turmaCode": "MATERNAL-II-C-EVELLYN"},
  {"firstName": "YSIS", "lastName": "NERIS LOPES", "cpf": null, "codigoAluno": "1166904", "inscricao": "203797", "dateOfBirth": "2022-10-28T12:00:00.000Z", "gender": "FEMININO", "raca": "preta", "turmaCode": "MATERNAL-II-C-EVELLYN"},
  {"firstName": "RANIEL", "lastName": "LOURENZO LINS ALVES", "cpf": "11944858121.0", "codigoAluno": "1252041", "inscricao": "243546", "dateOfBirth": "2023-04-24T12:00:00.000Z", "gender": "MASCULINO", "raca": "branca", "turmaCode": "MATERNAL-I-A-LUCIENE"},
  {"firstName": "RAVI", "lastName": "LORENZO RODRIGUES OLIVEIRA", "cpf": null, "codigoAluno": "1202238", "inscricao": "223169", "dateOfBirth": "2023-05-16T12:00:00.000Z", "gender": "MASCULINO", "raca": "branca", "turmaCode": "MATERNAL-I-A-LUCIENE"},
  {"firstName": "SAYMON", "lastName": "SILVA BORGES", "cpf": null, "codigoAluno": "1240174", "inscricao": "236570", "dateOfBirth": "2023-07-17T12:00:00.000Z", "gender": "MASCULINO", "raca": "parda", "turmaCode": "MATERNAL-I-A-LUCIENE"},
  {"firstName": "VALENTINA", "lastName": "DOS SANTOS SOARES", "cpf": null, "codigoAluno": "1209468", "inscricao": "225219", "dateOfBirth": "2023-05-10T12:00:00.000Z", "gender": "FEMININO", "raca": "parda", "turmaCode": "MATERNAL-I-A-LUCIENE"},
];

async function main() {
  console.log('\n🚀 Seed CEPI Arara Canindé — somente novos registros\n');

  // 1. Turmas
  console.log('── Turmas ──');
  const turmaMap = new Map<string, string>();
  for (const t of TURMAS) {
    const existing = await prisma.classroom.findFirst({
      where: { unitId: UNIT_ID, code: t.code }
    });
    if (existing) {
      turmaMap.set(t.code, existing.id);
      console.log(`  ⏭️  Já existe: ${t.name}`);
    } else {
      const c = await prisma.classroom.create({
        data: { unitId: UNIT_ID, name: t.name, code: t.code, ageGroupMin: t.ageGroupMin, ageGroupMax: t.ageGroupMax, capacity: 30, isActive: true, createdBy: 'seed-arara' }
      });
      turmaMap.set(t.code, c.id);
      console.log(`  ✅ Criada: ${t.name}`);
    }
  }

  // 2. Alunos — somente os que não existem ainda
  console.log('\n── Alunos ──');
  let criados = 0, existentes = 0, erros = 0;

  for (const a of ALUNOS) {
    try {
      const classroomId = turmaMap.get(a.turmaCode);
      if (!classroomId) { erros++; continue; }

      // Buscar por codigoAluno (identificador único desta planilha)
      const existing = await prisma.child.findFirst({
        where: { codigoAluno: a.codigoAluno, mantenedoraId: MANTENEDORA_ID }
      });

      if (existing) {
        // Atualizar apenas campos vazios
        await prisma.child.update({
          where: { id: existing.id },
          data: {
            ...(a.cpf && !existing.cpf ? { cpf: a.cpf } : {}),
            ...(a.raca && !existing.raca ? { raca: a.raca } : {}),
            ...(a.inscricao && !existing.inscricao ? { inscricao: a.inscricao } : {}),
            updatedBy: 'seed-arara',
          }
        });

        // Garantir matrícula na turma correta
        await prisma.enrollment.upsert({
          where: { childId_classroomId: { childId: existing.id, classroomId } },
          create: { childId: existing.id, classroomId, enrollmentDate: new Date(), status: 'ATIVA', createdBy: 'seed-arara' },
          update: { status: 'ATIVA' },
        });
        existentes++;
      } else {
        // Criar novo aluno
        const child = await prisma.child.create({
          data: {
            mantenedoraId: MANTENEDORA_ID,
            unitId: UNIT_ID,
            firstName: a.firstName,
            lastName: a.lastName,
            cpf: a.cpf ?? null,
            codigoAluno: a.codigoAluno,
            inscricao: a.inscricao,
            dateOfBirth: new Date(a.dateOfBirth),
            gender: a.gender as any,
            raca: a.raca,
            isActive: true,
            createdBy: 'seed-arara',
            updatedBy: 'seed-arara',
          }
        });

        await prisma.enrollment.create({
          data: { childId: child.id, classroomId, enrollmentDate: new Date(), status: 'ATIVA', createdBy: 'seed-arara' }
        });
        criados++;
      }
    } catch(e: any) {
      console.error(`  ❌ ${a.firstName} ${a.lastName}: ${e.message}`);
      erros++;
    }
  }

  console.log(`  ✅ ${criados} novos alunos criados`);
  console.log(`  ⏭️  ${existentes} já existiam (dados complementados se necessário)`);
  console.log(`  ❌ ${erros} erros`);
  console.log('\n🎉 Concluído!\n');
}

main().catch(console.error).finally(() => prisma.$disconnect());
