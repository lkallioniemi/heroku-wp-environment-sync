import * as tmp from 'tmp'
import ux from 'cli-ux'

import AppInterface from './AppInterface';
import EnvFile from '../EnvFile';
import DBConfig from '../Structs/DBConfig';
import Domain from '../Structs/Domain';
import Cmd from '../Cmd';
import Env from '../Structs/Env';
import Colors from '../Colors';
import CacheHandler from '../CacheHandler';
import MySQL from '../MySQL';

export default class LocalApp implements AppInterface {
    name : string
    url : string

    domains : Domain [] = []
    db_env_name = ""
    db_config : DBConfig
    sql_dump_file : string = ""
    project_name : string = ""

    env : Env | null = null
    cache : CacheHandler | null = null

    constructor (url : string) {
        this.name = "localhost"
        this.url = url
        this.domains = [new Domain (url, false)]

        var env_file = new EnvFile()
        this.db_config = env_file.getDBConfig()
    }

    setEnv(env : Env | null) {
        if(env != null) {
            this.cache = new CacheHandler(env)
        }

        this.env = env        
    }

    async getDump (filename : string | null = null, use_cache = false) {
        const cache = new CacheHandler(this.env)
        const dump_filename = await cache.getDumpFilename(filename, use_cache)

        if(dump_filename) {
            this.sql_dump_file = dump_filename
        }

        await this.verifyDatabaseExistance()

        ux.action.start(`Fetching database from ${Colors.app(this.name)}`)
        
        await Cmd.execParsedErrors(`${await this.db_config.toDumpCmd()} > ${this.sql_dump_file}`)
        
        ux.action.stop()

        return this.sql_dump_file
    }

    async verifyDatabaseExistance () {
        if(!this.db_config) {
            return false
        }

        await MySQL.localDatabaseCreationQuestionare(this.db_config)

        return true
    }

    async pushDump (filename : string) {
        await this.verifyDatabaseExistance()

        ux.action.start(`Pushing dump to ${Colors.localApp(this.name)}`)
        
        await Cmd.exec(`mysql ${await this.db_config.authString()} ${this.db_config.name} < ${filename}`)

        ux.action.stop()

        return true
    }

    async load () {

    }
}