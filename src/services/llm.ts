import { config } from '../config.ts';

export type LLMService = {
  generateSummary(content: string): Promise<string>;
  generatePolicyDiffSummary(diff: string, title: string): Promise<string>;
};

export function createLLMService(): LLMService {
  if (config.isProd()) {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    
    return {
      async generateSummary(_content: string): Promise<string> {
        return 'TODO: Implement OpenAI API call to generate summary';
      },
      
      async generatePolicyDiffSummary(diff: string, title: string): Promise<string> {
        return `政策更新: ${title.substring(0, 50)}...`;
      }
    };
  }

  // 開発環境用のモック実装
  return {
    async generateSummary(_content: string): Promise<string> {
      return 'Mock summary for development';
    },
    
    async generatePolicyDiffSummary(diff: string, title: string): Promise<string> {
      const lines = diff.split('\n');
      const addedLines = lines.filter(line => line.startsWith('+')).length;
      const removedLines = lines.filter(line => line.startsWith('-')).length;
      
      let summary = '';
      if (title.includes('ビジョン')) {
        summary = `ビジョン更新: ${addedLines}行追加`;
      } else if (title.includes('デジタル')) {
        summary = `デジタル政策更新: ${addedLines}行追加`;
      } else {
        summary = `政策更新: ${addedLines}行追加、${removedLines}行削除`;
      }
      
      return summary.substring(0, 100);
    }
  };
}

export async function generatePolicyDiffSummaryWithFallback(
  service: LLMService,
  diff: string,
  title: string,
  retries: number = 3
): Promise<string> {
  for (let i = 0; i < retries; i++) {
    try {
      return await service.generatePolicyDiffSummary(diff, title);
    } catch (error) {
      if (i === retries - 1) {
        return `政策更新: ${title.substring(0, 50)}...`;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return `政策更新: ${title.substring(0, 50)}...`;
}

export class PolicyNotificationManager {
  private llmService: LLMService;
  
  constructor(llmService?: LLMService) {
    this.llmService = llmService || createLLMService();
  }
  
  async generatePolicyUpdateNotification(
    diff: string,
    title: string,
    prUrl?: string
  ): Promise<string> {
    if (!diff.trim()) {
      throw new Error('Empty policy diff provided');
    }
    
    const summary = await this.llmService.generatePolicyDiffSummary(diff, title);
    
    let notification = `🔔 チームみらい政策更新\n\n${summary}`;
    
    if (prUrl) {
      notification += `\n\n詳細: ${prUrl}`;
    }
    
    notification += '\n\n#チームみらい #政策更新';
    
    return notification;
  }
  
  async processPolicyPullRequest(prData: {
    title: string;
    diff: string;
    url: string;
    author: string;
    filesChanged: string[];
  }): Promise<{
    shouldNotify: boolean;
    notification: string;
    summary: string;
  }> {
    const isMinorChange = prData.title.toLowerCase().includes('fix:') ||
                         prData.title.toLowerCase().includes('typo') ||
                         prData.diff.split('\n').filter(line => line.startsWith('+')).length < 3;
    
    if (isMinorChange) {
      return {
        shouldNotify: false,
        notification: '',
        summary: ''
      };
    }
    
    const summary = await this.llmService.generatePolicyDiffSummary(prData.diff, prData.title);
    const notification = await this.generatePolicyUpdateNotification(
      prData.diff,
      prData.title,
      prData.url
    );
    
    return {
      shouldNotify: true,
      notification,
      summary
    };
  }
}
