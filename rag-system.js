// js/rag-system.js
class RAGSystem {
    constructor() {
        this.searchEngine = new VectorSearchEngine();
        // 第1回で作成したクライアントを再利用
        this.llm = new EducationLLMClient(API_CONFIG.studentId);
    }
    
    async initialize(documents) {
        console.log('RAGシステム初期化中...');
        for (const doc of documents) {
            await this.searchEngine.addDocument(
                doc.content, 
                doc  // メタデータも保存
            );
        }
        console.log(`${documents.length}件の文書を登録完了！`);
    }
    // ... 続く
    async query(question, options = {}) {
    // 1. 関連文書の検索
    const relevantDocs = await this.searchEngine.search(
        question, 
        options.retrieveCount || 3
    );
    
    if (relevantDocs.length === 0) {
        // 関連文書がなければ通常のLLM
        return await this.llm.chat(question);
    }
    
    // 2. コンテキストの構築
    const context = this.buildContext(relevantDocs);
    
    // 3. プロンプトの生成
    const prompt = this.buildPrompt(question, context);
    
    // 4. LLMで回答生成
    const response = await this.llm.chat(prompt);
    
    return { ...response, sources: relevantDocs };
    }

    buildContext(relevantDocs) {
        return relevantDocs
            .map((doc, index) => 
                `[文書${index + 1}] ${doc.document.text}`
            )
            .join('\n\n');
    }

    buildPrompt(question, context) {
        return `以下の文書を参考にして、質問に答えてください。

    参考文書:
    ${context}

    質問: ${question}

    回答:`;
    }


    displayRAGResult(result) {
        const container = document.getElementById('rag-result');
        
        // ★色を決める関数（追加）
        function getSimilarityColor(similarity) {
            if (similarity > 0.7) return '#4CAF50';      // 緑
            if (similarity > 0.5) return '#FF9800';      // オレンジ
            return '#9E9E9E';                            // グレー
        }
        
        // ★背景色の明るさを調整（追加）
        function getBackgroundColor(similarity) {
            if (similarity > 0.7) return '#E8F5E9';      // 薄い緑
            if (similarity > 0.5) return '#FFF3E0';      // 薄いオレンジ
            return '#F5F5F5';                            // 薄いグレー
        }
        
        // 既存のコードを修正
        container.innerHTML = `
            <div style="margin: 20px 0;">
                <h3 style="color: #2196F3;">回答:</h3>
                <p style="padding: 15px; background: #f5f5f5; border-radius: 5px;">
                    ${result.response}
                </p>
                
                <h4 style="margin-top: 20px;">参考文書:</h4>
                ${result.sources.map((source, index) => {
                    // ★各文書ごとに色を決定
                    const borderColor = getSimilarityColor(source.similarity);
                    const bgColor = getBackgroundColor(source.similarity);
                    
                    return `
                        <div style="
                            margin: 10px 0; 
                            padding: 10px; 
                            background: ${bgColor};                    /* ← 背景色を変える */
                            border-left: 4px solid ${borderColor};     /* ← ボーダー色を変える */
                            border-radius: 3px;
                        ">
                            <strong>文書 ${index + 1}</strong> 
                            <span style="color: ${borderColor}; font-weight: bold;">
                                (類似度: ${source.similarity.toFixed(3)})
                            </span>
                            <br>
                            <small>${source.document.text.substring(0, 100)}...</small>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        // ★アイコンマッピング（追加）
        const levelIcons = {'beginner': '🌱','intermediate': '🌿','advanced': '🌳','expert': '🏆'};


        // ★科目アイコン（追加）
        const subjectIcons = {
            'programming': '💻',
            'algorithms': '🧮',
            'ai': '🤖',
            'database': '🗄️',
            'network': '🌐'
        };
            
        container.innerHTML = `
            <div style="margin: 20px 0;">
                <h3 style="
                    color: #0D47A1;
                    background: linear-gradient(90deg, #E3F2FD, #BBDEFB);
                    padding: 10px 14px;
                    border-radius: 6px;
                    margin-bottom: 10px;
                ">🤖 AI回答:</h3>
                <p style="padding: 15px; background: #f5f5f5; border-radius: 5px;">
                    ${result.response}
                </p>
                
                <h4 style="margin-top: 20px;">📚 参考文書:</h4>
                ${result.sources.map((source, index) => {
                    const borderColor = getSimilarityColor(source.similarity);
                    const bgColor = getBackgroundColor(source.similarity);
                    
                    // ★アイコンを取得
                    const levelIcon = levelIcons[source.document.metadata.level] || '📄';
                    const subjectIcon = subjectIcons[source.document.metadata.subject] || '📚';
                    
                    return `
                        <div style="
                            margin: 10px 0; 
                            padding: 10px; 
                            background: ${bgColor};
                            border-left: 4px solid ${borderColor};
                            border-radius: 3px;
                        ">
                            <!-- ★アイコン表示（追加） -->
                            <div style="margin-bottom: 5px;">
                                ${levelIcon} ${subjectIcon} 
                                <strong>文書 ${index + 1}</strong> 
                                <span style="color: ${borderColor}; font-weight: bold;">
                                    (類似度: ${source.similarity.toFixed(3)})
                                </span>
                            </div>
                            
                            <small>${source.document.text.substring(0, 100)}...</small>
                            
                            <!-- ★メタデータ表示（追加） -->
                            <div style="margin-top: 5px; font-size: 11px; color: #666;">
                                ${source.document.metadata.title ? `📖 ${source.document.metadata.title}` : ''} 
                                ${source.document.metadata.subject ? `| 📂 ${source.document.metadata.subject}` : ''}
                                ${source.document.metadata.level ? `| ${levelIcon} ${source.document.metadata.level}` : ''}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }
}