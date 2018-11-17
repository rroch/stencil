import * as d from '../../declarations';
import { addAutoGenerate } from './auto-docs';
import { AUTO_GENERATE_COMMENT } from './constants';


export async function generateReadmeDocs(config: d.Config, compilerCtx: d.CompilerCtx, readmeOutputs: d.OutputTargetDocsReadme[], docs: d.DocsData) {
  await Promise.all(docs.components.map(async (cmpData) => {
    await generateReadme(config, compilerCtx, readmeOutputs, cmpData);
  }));
}


async function generateReadme(config: d.Config, compilerCtx: d.CompilerCtx, readmeOutputs: d.OutputTargetDocsReadme[], cmpData: d.DocsDataComponent) {
  let existingContent: string = null;

  try {
    existingContent = await compilerCtx.fs.readFile(cmpData.readmePath);
  } catch (e) {}

  if (typeof existingContent === 'string' && existingContent.trim() !== '') {
    // update
    return updateReadme(config, compilerCtx, readmeOutputs, cmpData, existingContent);

  } else {
    // create
    return createReadme(config, compilerCtx, readmeOutputs, cmpData);
  }
}


async function createReadme(config: d.Config, compilerCtx: d.CompilerCtx, readmeOutputs: d.OutputTargetDocsReadme[], cmpData: d.DocsDataComponent) {
  const content: string[] = [];

  content.push(`# ${cmpData.cmpMeta.tagNameMeta}`);
  content.push(``);
  content.push(``);
  content.push(``);
  addAutoGenerate(cmpData.cmpMeta, content);

  const readmeContent = content.join('\n');

  await Promise.all(readmeOutputs.map(async readmeOutput => {
    if (readmeOutput.dir) {
      const relPath = config.sys.path.relative(config.srcDir, cmpData.readmePath);
      const absPath = config.sys.path.join(readmeOutput.dir, relPath);
      await compilerCtx.fs.writeFile(absPath, readmeContent);
    }

    await compilerCtx.fs.writeFile(cmpData.readmePath, readmeContent);
  }));

  config.logger.info(`created readme docs: ${cmpData.cmpMeta.tagNameMeta}`);
}


async function updateReadme(config: d.Config, compilerCtx: d.CompilerCtx, readmeOutputs: d.OutputTargetDocsReadme[], cmpData: d.DocsDataComponent, existingContent: string) {
  if (typeof existingContent !== 'string' || existingContent.trim() === '') {
    throw new Error('missing existing content');
  }

  const content: string[] = [];

  const existingLines = existingContent.split('\n');
  let foundAutoGenerate = false;

  for (let i = 0; i < existingLines.length; i++) {
    if (existingLines[i].trim() === AUTO_GENERATE_COMMENT) {
      foundAutoGenerate = true;
      break;
    }
    content.push(existingLines[i]);
  }

  if (!foundAutoGenerate) {
    config.logger.warn(`Unable to find ${AUTO_GENERATE_COMMENT} comment for docs auto-generation updates: ${cmpData.readmePath}`);
    return true;
  }

  addAutoGenerate(cmpData.moduleFile.cmpMeta, content);

  const updatedContent = content.join('\n');

  await Promise.all(readmeOutputs.map(async readmeOutput => {
    if (updatedContent.trim() !== existingContent.trim()) {
      await compilerCtx.fs.writeFile(cmpData.readmePath, updatedContent);
      config.logger.info(`updated readme docs: ${cmpData.cmpMeta.tagNameMeta}`);
    }

    if (readmeOutput.dir) {
      const relPath = config.sys.path.relative(config.srcDir, cmpData.readmePath);
      const absPath = config.sys.path.join(readmeOutput.dir, relPath);
      await compilerCtx.fs.writeFile(absPath, updatedContent);
    }
  }));

  return true;
}