import * as path from 'path';
import * as Handlebars from 'handlebars';

import { logger } from '../../logger';
import { HtmlEngineHelpers } from './html.engine.helpers';
import { DependenciesEngine } from './dependencies.engine';
import { ConfigurationInterface } from '../interfaces/configuration.interface';
import { FileEngine } from './file.engine';

export class HtmlEngine {
    private cache: { page: string } = {} as any;
    private compiledPage;

    private precompiledMenu;
    private compiledMobileMenu;
    private compiledMenu;

    constructor(
        configuration: ConfigurationInterface,
        dependenciesEngine: DependenciesEngine,
        private fileEngine: FileEngine = new FileEngine()
    ) {
        const helper = new HtmlEngineHelpers();
        helper.registerHelpers(Handlebars, configuration, dependenciesEngine);
    }

    public init(templatePath: string): Promise<void> {
        let partials = [
            'overview',
            'markdown',
            'modules',
            'module',
            'components',
            'component',
            'component-detail',
            'directives',
            'directive',
            'injectables',
            'injectable',
            'interceptor',
            'guard',
            'pipes',
            'pipe',
            'classes',
            'class',
            'interface',
            'routes',
            'index',
            'index-misc',
            'search-results',
            'search-input',
            'link-type',
            'block-method',
            'block-enum',
            'block-property',
            'block-index',
            'block-constructor',
            'block-typealias',
            'block-accessors',
            'block-input',
            'block-output',
            'coverage-report',
						'unit-test-report',
            'miscellaneous-functions',
            'miscellaneous-variables',
            'miscellaneous-typealiases',
            'miscellaneous-enumerations',
            'additional-page',
            'package-dependencies'
        ];
        if(templatePath){
          if(this.fileEngine.existsSync(path.resolve(process.cwd()+path.sep+templatePath))===false){
              logger.warn('Template path specificed but does not exist...using default templates');
              //new Error('Template path specified but does not exist');
           }
        }

        return Promise.all(
            partials.map(partial => {
            let partialPath = this.determineTemplatePath(templatePath, 'partials/'+partial+'.hbs');
                return this.fileEngine
                    .get(partialPath)
                    .then(data => Handlebars.registerPartial(partial, data));
            })
        )
        .then(() => {
              let pagePath = this.determineTemplatePath(templatePath, 'page.hbs');
                return this.fileEngine
                    .get(pagePath)
                    .then(data => {
                        this.cache.page = data;
                        this.compiledPage = Handlebars.compile(this.cache.page, {
                            preventIndent: true,
                            strict: true
                        });
                    });
        })
        .then(() => {
               let menuPath = this.determineTemplatePath(templatePath, 'partials/menu.hbs');
                return this.fileEngine
                    .get(menuPath)
                    .then(menuTemplate => {
                        this.precompiledMenu = Handlebars.compile(menuTemplate, {
                            preventIndent: true,
                            strict: true
                        });
                    });
          });
    }

    public renderMenu(templatePath, data) {
        let menuPath = this.determineTemplatePath(templatePath, 'partials/menu.hbs');
        return this.fileEngine
            .get(menuPath)
            .then(menuTemplate => {
                data.menu = 'normal';
                return Handlebars.compile(menuTemplate, {
                    preventIndent: true,
                    strict: true
                })({ ...data });
            });
    }

    public render(mainData: any, page: any): string {
        let o = mainData;
        (Object as any).assign(o, page);

        // let mem = process.memoryUsage();
        // console.log(`heapTotal: ${mem.heapTotal} | heapUsed: ${mem.heapUsed}`);

        return this.compiledPage({
            data: o
        });
    }
    private determineTemplatePath(templatePath: string, filePath: string): string {
      let outPath = path.resolve(__dirname + '/../src/templates/'+filePath);
      if(templatePath){
         let testPath = path.resolve(process.cwd() + path.sep + templatePath + path.sep + filePath);
        outPath = (this.fileEngine.existsSync(testPath) ? testPath : outPath); 
      }
     return outPath;
    }

    public generateCoverageBadge(outputFolder, label, coverageData) {
        return this.fileEngine
            .get(path.resolve(__dirname + '/../src/templates/partials/coverage-badge.hbs'))
            .then(
                data => {
                    let template: any = Handlebars.compile(data);
										coverageData.label = label;
                    let result = template({
                        data: coverageData
                    });
                    let testOutputDir = outputFolder.match(process.cwd());
                    if (testOutputDir && testOutputDir.length > 0) {
                        outputFolder = outputFolder.replace(process.cwd() + path.sep, '');
                    }

                    return this.fileEngine
                        .write(outputFolder + path.sep + '/images/coverage-badge-' + label + '.svg', result)
                        .catch(err => {
                            logger.error('Error during coverage badge ' + label + ' file generation ', err);
                            return Promise.reject(err);
                        });
                },
                err => Promise.reject('Error during coverage badge generation')
            );
    }
}
